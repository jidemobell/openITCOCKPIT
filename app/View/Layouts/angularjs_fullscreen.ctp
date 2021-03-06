<?php
// Copyright (C) <2015>  <it-novum GmbH>
//
// This file is dual licensed
//
// 1.
//	This program is free software: you can redistribute it and/or modify
//	it under the terms of the GNU General Public License as published by
//	the Free Software Foundation, version 3 of the License.
//
//	This program is distributed in the hope that it will be useful,
//	but WITHOUT ANY WARRANTY; without even the implied warranty of
//	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//	GNU General Public License for more details.
//
//	You should have received a copy of the GNU General Public License
//	along with this program.  If not, see <http://www.gnu.org/licenses/>.
//

// 2.
//	If you purchased an openITCOCKPIT Enterprise Edition you can use this file
//	under the terms of the openITCOCKPIT Enterprise Edition license agreement.
//	License agreement and license key will be shipped with the order
//	confirmation.

$bodyClass = '';
if ($sideMenuClosed) {
    $bodyClass = 'minified';
}

$AngularAssets = new \itnovum\openITCOCKPIT\Core\AngularJS\AngularAssets();
$scripts = $AngularAssets->getJsFiles();


if ($this->request->params['controller'] === 'statusmaps') {
    $scripts[] = 'smartadmin/js/notification/SmartNotification.js';
}

App::uses('Folder', 'Utility');
$appScripts = [];
if (ENVIRONMENT === Environments::PRODUCTION) {
    $compressedAngularControllers = WWW_ROOT . 'js' . DS . 'compressed_angular_controllers.js';
    $compressedAngularDrectives = WWW_ROOT . 'js' . DS . 'compressed_angular_directives.js';
    $compressedAngularServices = WWW_ROOT . 'js' . DS . 'compressed_angular_services.js';
    if (file_exists($compressedAngularControllers) && file_exists($compressedAngularDrectives) && file_exists($compressedAngularServices)) {
        $appScripts[] = str_replace(WWW_ROOT, '', $compressedAngularServices);
        $appScripts[] = str_replace(WWW_ROOT, '', $compressedAngularDrectives);
        $appScripts[] = str_replace(WWW_ROOT, '', $compressedAngularControllers);
    }
} else {
    $core = new Folder(WWW_ROOT . 'js' . DS . 'scripts');
    $uncompressedAngular = str_replace(WWW_ROOT, '', $core->findRecursive('.*\.js'));
    foreach (CakePlugin::loaded() as $pluginName) {
        $plugin = new Folder(APP . 'Plugin' . DS . $pluginName . DS . 'webroot' . DS . 'js' . DS . 'scripts');
        $filenames = str_replace(APP . 'Plugin' . DS . $pluginName . DS . 'webroot' . DS, '', $plugin->findRecursive('.*\.js'));
        if (!empty($filenames)) {
            $fullPath = [];
            foreach ($filenames as $filename) {
                $fullPath[] = $pluginName . DS . $filename;
            }
            $uncompressedAngular = array_merge($uncompressedAngular, $fullPath);
        }
    }
    $appScripts = array_merge($appScripts, $uncompressedAngular);
}

?>
<!DOCTYPE html>
<html lang="en" ng-app="openITCOCKPIT">
<head>
    <!--[if IE]>
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <![endif]-->
    <?php echo $this->Html->charset(); ?>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script data-pace-options='{ "ajax": false }' src='/smartadmin/js/plugin/pace/pace.min.js'></script>
    <title>
        <?php echo $title_for_layout; ?> - <?php echo Configure::read('general.site_name') ?>
    </title>
    <?php
    $fileVersion = '?v' . time();
    if (ENVIRONMENT === Environments::PRODUCTION) {
        Configure::load('version');
        $fileVersion = '?v' . Configure::read('version');
    }


    echo $this->Html->meta('icon');
    echo $this->element('assets_css');

    foreach ($scripts as $script):
        printf('<script src="/%s%s"></script>%s', $script, $fileVersion, PHP_EOL);
    endforeach;

    foreach ($appScripts as $appScript):
        printf('<script src="/%s%s"></script>%s', $appScript, $fileVersion, PHP_EOL);
    endforeach;
    ?>
</head>
<body class="<?= $bodyClass ?>">
<div id="global-loading">
    <i class="fa fa-refresh fa-spin"></i>
</div>

<div id="uglyDropdownMenuHack"></div>
<div ng-controller="LayoutController">

    <div id="content">
        <?php echo $this->Flash->render(); ?>
        <?php echo $this->Flash->render('auth'); ?>
        <?php $AngularController = sprintf(
            '%s%sController',
            ucfirst($this->request->controller),
            ucfirst($this->request->action)
        ); ?>
        <div ng-controller="<?php echo $AngularController; ?>">
            <div ui-view>
                <?php
                //Remove this line if ui-router is in use!!
                echo $this->Flash->render();
                echo $this->Flash->render('auth');
                echo $content_for_layout;
                ?>
            </div>
        </div>
        <?php echo $this->element('Admin.sql_dump'); ?>
    </div>
</div>

<div id="scroll-top-container">
    <i class="fa fa-arrow-up fa-2x" title="<?php echo __('Scroll back to top'); ?>"></i>
</div>

<?php printf('<script src="/%s"></script>', 'smartadmin/js/app.js'); ?>

</body>
</html>
