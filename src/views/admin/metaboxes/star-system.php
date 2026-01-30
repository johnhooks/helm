<?php
/**
 * Star system contents meta box view.
 *
 * @var array<\Helm\Planets\PlanetPost> $planets
 * @var bool $originInitialized
 * @var string|null $generateUrl
 */
?>
<?php if ($planets === []) : ?>
    <p><?php esc_html_e('No planets generated yet.', 'helm'); ?></p>

    <?php if ($originInitialized && $generateUrl !== null) : ?>
        <p><a href="<?php echo esc_url($generateUrl); ?>" class="button"><?php esc_html_e('Generate Planets', 'helm'); ?></a></p>
    <?php else : ?>
        <p class="description"><?php esc_html_e('Initialize Origin first to generate planets.', 'helm'); ?></p>
    <?php endif; ?>
<?php else : ?>
    <table class="widefat striped">
        <thead>
            <tr>
                <th><?php esc_html_e('Planet', 'helm'); ?></th>
                <th><?php esc_html_e('Type', 'helm'); ?></th>
                <th><?php esc_html_e('Orbit', 'helm'); ?></th>
                <th><?php esc_html_e('Habitable', 'helm'); ?></th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($planets as $planetPost) : ?>
                <?php $editUrl = get_edit_post_link($planetPost->postId()); ?>
                <tr>
                    <td><a href="<?php echo esc_url($editUrl ?? '#'); ?>"><?php echo esc_html($planetPost->displayName()); ?></a></td>
                    <td><?php echo esc_html($planetPost->type()->label()); ?></td>
                    <td><?php echo esc_html(number_format($planetPost->orbitAu(), 2)); ?> AU</td>
                    <td><?php echo $planetPost->isHabitable() ? esc_html__('Yes', 'helm') : '—'; ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <p class="description">
        <?php
        printf(
            esc_html__('%d planets in this system.', 'helm'),
            count($planets)
        );
        ?>
    </p>
<?php endif; ?>
