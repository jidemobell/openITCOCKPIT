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

use itnovum\openITCOCKPIT\Core\HoststatusFields;
use itnovum\openITCOCKPIT\Core\ServicestatusFields;
use itnovum\openITCOCKPIT\Core\StatehistoryHostConditions;
use itnovum\openITCOCKPIT\Core\StatehistoryServiceConditions;
use itnovum\openITCOCKPIT\Core\Views\StatehistoryHost;
use itnovum\openITCOCKPIT\Core\Views\StatehistoryService;
use itnovum\openITCOCKPIT\Core\Views\UserTime;
use itnovum\openITCOCKPIT\Database\ScrollIndex;


class StatehistoriesController extends AppController {
    /*
     * Attention! In this case we load an external Model from the monitoring plugin! The Controller
     * use this external model to fetch the required data out of the database
     */
    public $uses = [
        MONITORING_STATEHISTORY_HOST,
        MONITORING_STATEHISTORY_SERVICE,
        MONITORING_STATEHISTORY,
        MONITORING_SERVICESTATUS,
        MONITORING_HOSTSTATUS,
        'Host',
        'Service',
        'Documentation'
    ];

    public $components = ['RequestHandler'];
    public $helpers = ['Status', 'Monitoring'];
    public $layout = 'Admin.default';

    public function service($id = null) {
        $this->layout = 'blank';

        if (!$this->Service->exists($id) && $id !== null) {
            throw new NotFoundException(__('Invalid service'));
        }

        if (!$this->isAngularJsRequest() && $id === null) {
            //Service for .html requests
            return;
        }

        //Service for .json requests
        $service = $this->Service->find('first', [
            'recursive'  => -1,
            'fields'     => [
                'Service.id',
                'Service.uuid',
                'Service.name',
                'Service.service_type',
                'Service.service_url'
            ],
            'contain'    => [
                'Host'            => [
                    'fields' => [
                        'Host.id',
                        'Host.name',
                        'Host.uuid',
                        'Host.address'
                    ],
                    'Container',
                ],
                'Servicetemplate' => [
                    'fields' => [
                        'Servicetemplate.id',
                        'Servicetemplate.name',
                    ],
                ],
            ],
            'conditions' => [
                'Service.id' => $id,
            ],
        ]);

        $containerIdsToCheck = Hash::extract($service, 'Host.Container.{n}.HostsToContainer.container_id');
        $containerIdsToCheck[] = $service['Host']['container_id'];

        //Check if user is permitted to see this object
        if (!$this->allowedByContainerId($containerIdsToCheck, false)) {
            $this->render403();
            return;
        }

        $AngularStatehistoryControllerRequest = new \itnovum\openITCOCKPIT\Core\AngularJS\Request\StatehistoryControllerRequest($this->request);


        //Process conditions
        $Conditions = new StatehistoryServiceConditions();
        $Conditions->setLimit($this->Paginator->settings['limit']);
        $Conditions->setOrder($AngularStatehistoryControllerRequest->getOrderForPaginator('StatehistoryService.state_time', 'desc'));
        $Conditions->setStates($AngularStatehistoryControllerRequest->getServiceStates());
        $Conditions->setStateTypes($AngularStatehistoryControllerRequest->getServiceStateTypes());
        $Conditions->setFrom($AngularStatehistoryControllerRequest->getFrom());
        $Conditions->setTo($AngularStatehistoryControllerRequest->getTo());
        $Conditions->setServiceUuid($service['Service']['uuid']);

        //Query state history records
        $query = $this->StatehistoryService->getQuery($Conditions, $AngularStatehistoryControllerRequest->getServiceFilters());

        $this->Paginator->settings = $query;
        $this->Paginator->settings['page'] = $AngularStatehistoryControllerRequest->getPage();

        if ($this->isScrollRequest()) {
            $ScrollIndex = new ScrollIndex($this->Paginator, $this);
            $statehistories = $this->StatehistoryService->find('all', $this->Paginator->settings);
            $ScrollIndex->determineHasNextPage($statehistories);
            $ScrollIndex->scroll();
        } else {
            $statehistories = $this->Paginator->paginate(
                $this->StatehistoryService->alias,
                [],
                [key($this->Paginator->settings['order'])]
            );
        }

        $all_statehistories = [];
        $UserTime = new UserTime($this->Auth->user('timezone'), $this->Auth->user('dateformat'));
        foreach ($statehistories as $statehistory) {
            $Statehistory = new StatehistoryService($statehistory['StatehistoryService'], $UserTime);
            $all_statehistories[] = [
                'StatehistoryService' => $Statehistory->toArray()
            ];
        }


        $this->set(compact(['all_statehistories']));
        $toJson = ['all_statehistories', 'paging'];
        if ($this->isScrollRequest()) {
            $toJson = ['all_statehistories', 'scroll'];
        }
        $this->set('_serialize', $toJson);
    }

    public function host($id = null) {
        $this->layout = 'blank';

        if (!$this->Host->exists($id) && $id !== null) {
            throw new NotFoundException(__('Invalid host'));
        }

        if (!$this->isAngularJsRequest() && $id === null) {
            //Host for .html request
            return;
        }

        //Host for .json request
        $host = $this->Host->find('first', [
            'recursive'  => -1,
            'fields'     => [
                'Host.id',
                'Host.uuid',
                'Host.container_id'
            ],
            'conditions' => [
                'Host.id' => $id,
            ],
            'contain'    => [
                'Container',
            ],
        ]);

        //Check if user is permitted to see this object
        $containerIdsToCheck = Hash::extract($host, 'Container.{n}.HostsToContainer.container_id');
        $containerIdsToCheck[] = $host['Host']['container_id'];
        if (!$this->allowedByContainerId($containerIdsToCheck, false)) {
            $this->render403();
            return;
        }

        $AngularStatehistoryControllerRequest = new \itnovum\openITCOCKPIT\Core\AngularJS\Request\StatehistoryControllerRequest($this->request);
        $UserTime = new UserTime($this->Auth->user('timezone'), $this->Auth->user('dateformat'));

        //Process conditions
        $Conditions = new StatehistoryHostConditions();
        $Conditions->setLimit($this->Paginator->settings['limit']);
        $Conditions->setOrder($AngularStatehistoryControllerRequest->getOrderForPaginator('StatehistoryHost.state_time', 'desc'));
        $Conditions->setStates($AngularStatehistoryControllerRequest->getHostStates());
        $Conditions->setStateTypes($AngularStatehistoryControllerRequest->getHostStateTypes());
        $Conditions->setFrom($AngularStatehistoryControllerRequest->getFrom());
        $Conditions->setTo($AngularStatehistoryControllerRequest->getTo());
        $Conditions->setHostUuid($host['Host']['uuid']);

        //Query state history records
        $query = $this->StatehistoryHost->getQuery($Conditions, $AngularStatehistoryControllerRequest->getHostFilters());


        $this->Paginator->settings = $query;
        $this->Paginator->settings['page'] = $AngularStatehistoryControllerRequest->getPage();
        if ($this->isScrollRequest()) {
            $ScrollIndex = new ScrollIndex($this->Paginator, $this);
            $statehistories = $this->StatehistoryHost->find('all', $this->Paginator->settings);
            $ScrollIndex->determineHasNextPage($statehistories);
            $ScrollIndex->scroll();
        } else {
            $statehistories = $this->Paginator->paginate(null, [], [key($this->Paginator->settings['order'])]);
        }

        $all_statehistories = [];
        foreach ($statehistories as $statehistory) {
            $StatehistoryHost = new StatehistoryHost($statehistory['StatehistoryHost'], $UserTime);
            $all_statehistories[] = [
                'StatehistoryHost' => $StatehistoryHost->toArray()
            ];
        }

        $this->set(compact(['all_statehistories']));

        $toJson = ['all_statehistories', 'paging'];
        if ($this->isScrollRequest()) {
            $toJson = ['all_statehistories', 'scroll'];
        }
        $this->set('_serialize', $toJson);
    }
}
