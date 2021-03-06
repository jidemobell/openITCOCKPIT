angular.module('openITCOCKPIT')
    .controller('ServicechecksIndexController', function($scope, $http, $rootScope, $httpParamSerializer, SortService, QueryStringService){

        SortService.setSort(QueryStringService.getValue('sort', 'Servicecheck.start_time'));
        SortService.setDirection(QueryStringService.getValue('direction', 'desc'));
        $scope.currentPage = 1;

        $scope.id = QueryStringService.getCakeId();

        var now = new Date();
        $scope.useScroll = true;

        /*** Filter Settings ***/
        var defaultFilter = function(){
            $scope.filter = {
                Servicecheck: {
                    state: {
                        ok: false,
                        warning: false,
                        critical: false,
                        unknown: false
                    },
                    state_types: {
                        soft: false,
                        hard: false
                    },
                    output: '',
                    perfdata: ''
                },
                from: date('d.m.Y H:i', now.getTime() / 1000 - (3600 * 24 * 30)),
                to: date('d.m.Y H:i', now.getTime() / 1000 + (3600 * 24 * 30 * 2))
            };
        };
        /*** Filter end ***/

        $scope.init = true;
        $scope.showFilter = false;


        $scope.load = function(){

            var state_type = '';
            if($scope.filter.Servicecheck.state_types.soft ^ $scope.filter.Servicecheck.state_types.hard){
                state_type = 0;
                if($scope.filter.Servicecheck.state_types.hard === true){
                    state_type = 1;
                }
            }

            $http.get("/servicechecks/index/" + $scope.id + ".json", {
                params: {
                    'angular': true,
                    'scroll': $scope.useScroll,
                    'sort': SortService.getSort(),
                    'page': $scope.currentPage,
                    'direction': SortService.getDirection(),
                    'filter[Servicecheck.output]': $scope.filter.Servicecheck.output,
                    'filter[Servicecheck.state][]': $rootScope.currentStateForApi($scope.filter.Servicecheck.state),
                    'filter[Servicecheck.state_type]': state_type,
                    'filter[from]': $scope.filter.from,
                    'filter[to]': $scope.filter.to
                }
            }).then(function(result){
                //console.log(result.data.all_statehistories[0]["StatehistoryService"]);
                $scope.servicechecks = result.data.all_servicechecks;
                $scope.paging = result.data.paging;
                $scope.scroll = result.data.scroll;
                $scope.init = false;
            });
        };

        $scope.triggerFilter = function(){
            $scope.showFilter = !$scope.showFilter === true;
        };

        $scope.resetFilter = function(){
            defaultFilter();
        };


        $scope.changepage = function(page){
            if(page !== $scope.currentPage){
                $scope.currentPage = page;
                $scope.load();
            }
        };

        $scope.changeMode = function(val){
            $scope.useScroll = val;
            $scope.load();
        };

        //Fire on page load
        defaultFilter();
        SortService.setCallback($scope.load);

        $scope.$watch('filter', function(){
            $scope.currentPage = 1;
            $scope.load();
        }, true);

    });