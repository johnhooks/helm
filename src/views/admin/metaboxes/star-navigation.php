<?php
/**
 * Star navigation meta box view.
 *
 * @var int|null $nodeId
 * @var array{float, float, float} $coords
 */
?>
<p>
    <strong><?php esc_html_e('Node ID:', 'helm'); ?></strong>
    <?php echo $nodeId !== null ? esc_html((string) $nodeId) : '—'; ?>
</p>
<p>
    <strong><?php esc_html_e('3D Position:', 'helm'); ?></strong><br>
    X: <?php echo esc_html(number_format($coords[0], 2)); ?> ly<br>
    Y: <?php echo esc_html(number_format($coords[1], 2)); ?> ly<br>
    Z: <?php echo esc_html(number_format($coords[2], 2)); ?> ly
</p>
