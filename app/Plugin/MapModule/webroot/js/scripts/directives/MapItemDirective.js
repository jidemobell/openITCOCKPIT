angular.module('openITCOCKPIT').directive('mapItem', function($http, $interval, UuidService, BlinkService){
    return {
        restrict: 'E',
        templateUrl: '/map_module/mapeditors/mapitem.html',
        scope: {
            'item': '=',
            'refreshInterval': '='
        },
        controller: function($scope){
            $scope.init = true;
            $scope.statusUpdateInterval = null;


            var uuidForBlinkService = null;
            var interval = null;

            $scope.load = function(){
                if(uuidForBlinkService === null){
                    uuidForBlinkService = UuidService.v4();
                }

                $http.get("/map_module/mapeditors/mapitem/.json", {
                    params: {
                        'angular': true,
                        'disableGlobalLoader': true,
                        'objectId': $scope.item.object_id,
                        'mapId': $scope.item.map_id,
                        'type': $scope.item.type
                    }
                }).then(function(result){
                    $scope.icon = result.data.data.icon;
                    $scope.icon_property = result.data.data.icon_property;
                    $scope.allowView = result.data.allowView;
                    $scope.init = false;

                    getLable(result.data.data);

                    $scope.currentIcon = $scope.icon;

                    if(result.data.data.isAcknowledged === true || result.data.data.isInDowntime === true){
                        BlinkService.registerNewObject(uuidForBlinkService, $scope.blinkServiceCallback);
                    }else{
                        BlinkService.unregisterObject(uuidForBlinkService);
                    }

                });
            };

            var getLable = function(data){
                $scope.lable = '';
                switch($scope.item.type){
                    case 'host':
                        $scope.lable = data.Host.hostname;
                        break;

                    case 'service':
                        $scope.lable = data.Host.hostname + '/' + data.Service.servicename;
                        break;

                    case 'hostgroup':
                        $scope.lable = data.Hostgroup.name;
                        break;

                    case 'servicegroup':
                        $scope.lable = data.Servicegroup.name;
                        break;

                    case 'map':
                        $scope.lable = data.Map.name;
                        break;
                }
            };

            var startBlink = function(){
                interval = $interval(function(){
                    if($scope.currentIcon === $scope.icon){
                        $scope.currentIcon = $scope.icon_property;
                    }else{
                        $scope.currentIcon = $scope.icon;
                    }
                }, 5000);
            };

            var stopBlink = function(){
                if(interval !== null){
                    $interval.cancel(interval);
                }
                interval = null;
            };

            $scope.blinkServiceCallback = function(){if($scope.currentIcon === $scope.icon){
                $scope.currentIcon = $scope.icon_property;
            }else{
                $scope.currentIcon = $scope.icon;
            }};

            $scope.stop = function(){
                BlinkService.unregisterObject(uuidForBlinkService);

                if($scope.statusUpdateInterval !== null){
                    $interval.cancel($scope.statusUpdateInterval);
                }
            };

            $scope.load();


            if($scope.refreshInterval > 0 && $scope.statusUpdateInterval === null){
                $scope.statusUpdateInterval = $interval(function(){
                    $scope.load();
                }, $scope.refreshInterval);
            }

            //Disable status update interval, if the object gets removed from DOM.
            //E.g in Map rotations
            $scope.$on('$destroy', function(){
                $scope.stop();
            });


            $scope.$watch('item.object_id', function(){
                if($scope.init || $scope.item.object_id === null){
                    //Avoid ajax error if user search a object in item config modal
                    return;
                }

                $scope.load();
            });


        },

        link: function(scope, element, attr){

        }
    };
});
