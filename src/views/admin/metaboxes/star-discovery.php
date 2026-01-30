<?php
/**
 * Star discovery meta box view.
 *
 * @var bool $isDiscovered
 * @var int $count
 * @var bool $isKnownSpace
 * @var string|null $firstDiscoverer
 */
?>
<p>
    <strong><?php esc_html_e('Status:', 'helm'); ?></strong>
    <?php if ($isDiscovered) : ?>
        <span style="color: green;"><?php esc_html_e('Discovered', 'helm'); ?></span>
    <?php else : ?>
        <span style="color: gray;"><?php esc_html_e('Undiscovered', 'helm'); ?></span>
    <?php endif; ?>
</p>

<?php if ($isDiscovered) : ?>
    <p>
        <strong><?php esc_html_e('Discovery Count:', 'helm'); ?></strong>
        <?php echo esc_html((string) $count); ?>
    </p>

    <p>
        <strong><?php esc_html_e('Known Space:', 'helm'); ?></strong>
        <?php echo $isKnownSpace ? esc_html__('Yes', 'helm') : esc_html__('No', 'helm'); ?>
    </p>

    <?php if ($firstDiscoverer !== null) : ?>
        <p>
            <strong><?php esc_html_e('First Discoverer:', 'helm'); ?></strong>
            <?php echo esc_html($firstDiscoverer); ?>
        </p>
    <?php endif; ?>
<?php endif; ?>
