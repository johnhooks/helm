#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"

skip_prepare=false
skip_clean=false
with_commit_hash=false

usage() {
    cat <<'EOF'
Usage: bin/build-release.sh [--skip-prepare] [--skip-clean] [--with-commit-hash] [--help]

Build a production-ready Helm plugin zip in ./release.

Options:
  --skip-prepare  Skip clean/install/build/Strauss preparation steps.
  --skip-clean    Skip the clean step that normally runs before prepare.
  --with-commit-hash
                  Append the current 7-character commit hash to the zip name.
  --help          Show this help.
EOF
}

while (($# > 0)); do
    case "$1" in
        --skip-prepare)
            skip_prepare=true
            ;;
        --skip-clean)
            skip_clean=true
            ;;
        --with-commit-hash)
            with_commit_hash=true
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
    shift
done

release_dir="${repo_root}/release"
stage_parent="${TMPDIR:-${repo_root}/tmp}"
mkdir -p "${stage_parent}"
export TMPDIR="${stage_parent}"
stage_root="$(mktemp -d "${stage_parent}/helm-release.XXXXXX")"
stage_dir="${stage_root}/helm"
temp_archive_path=""

cleanup() {
    rm -rf "${stage_root}"

    if [[ -n "${temp_archive_path}" && -e "${temp_archive_path}" ]]; then
        rm -f "${temp_archive_path}"
    fi
}

trap cleanup EXIT

require_command() {
    local command_name="$1"

    if ! command -v "${command_name}" >/dev/null 2>&1; then
        echo "Required command not found: ${command_name}" >&2
        exit 1
    fi
}

read_version() {
    local version

    version="$(
        sed -n 's/^ \* Version: //p' "${repo_root}/helm.php" | head -n 1
    )"

    if [[ -z "${version}" ]]; then
        echo "Unable to determine plugin version from helm.php" >&2
        exit 1
    fi

    printf '%s\n' "${version}"
}

read_commit_hash() {
    local commit_hash

    commit_hash="$(
        git -C "${repo_root}" rev-parse --short=7 HEAD
    )"

    if [[ -z "${commit_hash}" ]]; then
        echo "Unable to determine commit hash" >&2
        exit 1
    fi

    printf '%s\n' "${commit_hash}"
}

clean_prepare_artifacts() {
    echo "Cleaning generated release artifacts"
    rm -rf \
        "${repo_root}/build" \
        "${repo_root}/vendor"
}

prepare_release() {
    if [[ "${skip_clean}" == false ]]; then
        clean_prepare_artifacts
    fi

    echo "Installing production Composer dependencies"
    (
        cd "${repo_root}"
        composer install --no-dev --optimize-autoloader
    )

    echo "Building vendor-prefixed release dependencies"
    (
        cd "${repo_root}"
        composer strauss-release
    )

    echo "Installing Bun dependencies"
    (
        cd "${repo_root}"
        bun install
    )

    echo "Building frontend assets"
    (
        cd "${repo_root}"
        bun run build
    )
}

verify_required_paths() {
    local required_paths=(
        "helm.php"
        "build"
        "data"
        "vendor/autoload.php"
        "vendor/vendor-prefixed/autoload.php"
        "vendor/woocommerce/action-scheduler/action-scheduler.php"
    )
    local missing=()
    local path

    for path in "${required_paths[@]}"; do
        if [[ ! -e "${stage_dir}/${path}" ]]; then
            missing+=("${path}")
        fi
    done

    if ((${#missing[@]} > 0)); then
        printf 'Release staging is missing required runtime paths:\n' >&2
        printf '  %s\n' "${missing[@]}" >&2
        exit 1
    fi
}

verify_no_dev_packages() {
    local installed_file="${stage_dir}/vendor/composer/installed.php"
    local dev_mode

    if [[ ! -f "${installed_file}" ]]; then
        echo "Release staging is missing Composer installed package metadata: vendor/composer/installed.php" >&2
        exit 1
    fi

    dev_mode="$(
        php -r '$installed = require $argv[1]; echo empty($installed["root"]["dev"]) ? "0" : "1";' "${installed_file}"
    )"

    if [[ "${dev_mode}" == "1" ]]; then
        printf 'Release staging was built with Composer dev dependencies enabled.\n' >&2
        printf 'Run without --skip-prepare, or run composer install --no-dev before packaging.\n' >&2
        exit 1
    fi
}

require_command php
require_command rsync
require_command zip

if [[ "${skip_prepare}" == false ]]; then
    require_command composer
    require_command bun
    prepare_release
fi

if [[ "${with_commit_hash}" == true ]]; then
    require_command git
fi

version="$(read_version)"
archive_suffix=""

if [[ "${with_commit_hash}" == true ]]; then
    archive_suffix="-$(read_commit_hash)"
fi

archive_name="helm-${version}${archive_suffix}.zip"
archive_path="${release_dir}/${archive_name}"
temp_archive_path="${release_dir}/.${archive_name}.tmp.$$"

mkdir -p "${release_dir}" "${stage_dir}"

echo "Staging release files"
rsync -a --delete --exclude-from="${repo_root}/.distignore" "${repo_root}/" "${stage_dir}/"

verify_required_paths
verify_no_dev_packages

echo "Creating ${archive_path}"
(
    cd "${stage_root}"
    zip -rq "${temp_archive_path}" helm
)
mv -f "${temp_archive_path}" "${archive_path}"
temp_archive_path=""

file_count="$(find "${stage_dir}" -type f | wc -l | tr -d '[:space:]')"
archive_size="$(du -h "${archive_path}" | awk '{print $1}')"

printf 'Built %s\n' "${archive_path}"
printf 'Version: %s\n' "${version}"
if [[ "${with_commit_hash}" == true ]]; then
    printf 'Commit: %s\n' "${archive_suffix#-}"
fi
printf 'Staged files: %s\n' "${file_count}"
printf 'Archive size: %s\n' "${archive_size}"
