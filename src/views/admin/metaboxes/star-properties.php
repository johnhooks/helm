<?php
/**
 * Star properties meta box view.
 *
 * @var \Helm\Stars\Star $star
 */

$constellation = $star->properties['constellation'] ?? null;
?>
<table class="form-table" role="presentation">
    <tr>
        <th scope="row"><?php esc_html_e('Catalog ID', 'helm'); ?></th>
        <td><code><?php echo esc_html($star->id); ?></code></td>
    </tr>
    <tr>
        <th scope="row"><?php esc_html_e('Spectral Type', 'helm'); ?></th>
        <td><?php echo esc_html($star->spectralType !== '' ? $star->spectralType : '—'); ?></td>
    </tr>
    <tr>
        <th scope="row"><?php esc_html_e('Distance', 'helm'); ?></th>
        <td><?php echo esc_html(number_format($star->distanceLy, 2)); ?> ly</td>
    </tr>
    <tr>
        <th scope="row"><?php esc_html_e('Luminosity', 'helm'); ?></th>
        <td><?php echo esc_html($star->luminosity() !== null ? number_format($star->luminosity(), 3) . ' L' : '—'); ?></td>
    </tr>
    <tr>
        <th scope="row"><?php esc_html_e('Coordinates', 'helm'); ?></th>
        <td>
            RA: <?php echo esc_html(number_format($star->ra, 4)); ?>&deg;,
            Dec: <?php echo esc_html(number_format($star->dec, 4)); ?>&deg;
        </td>
    </tr>
    <?php if ($constellation !== null) : ?>
    <tr>
        <th scope="row"><?php esc_html_e('Constellation', 'helm'); ?></th>
        <td><?php echo esc_html($constellation); ?></td>
    </tr>
    <?php endif; ?>
</table>
