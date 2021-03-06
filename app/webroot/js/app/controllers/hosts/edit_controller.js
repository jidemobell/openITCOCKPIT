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

App.Controllers.HostsEditController = Frontend.AppController.extend({
    $contacts: null,
    $contactgroups: null,
    $hostgroups: null,
    $tagsinput: null,
    lang: null,

    components: ['Highlight', 'Ajaxloader', 'CustomVariables', 'ContainerSelectbox'],

    _initialize: function(){
        var self = this;

        this.Ajaxloader.setup();
        this.ContainerSelectbox.setup(this.Ajaxloader);
        this.ContainerSelectbox.addContainerEventListener({ // Bind change event for Container Selectbox
            selectBoxSelector: '#HostContainerId',
            event: 'change.hostContainer',
            ajaxUrl: '/Hosts/loadElementsByContainerId/:selectBoxValue:/' + encodeURIComponent(self.getVar('hostId')) + '.json',
            fieldTypes: {
                hosttemplates: '#HostHosttemplateId',
                hostgroups: '#HostHostgroup',
                // parenthosts: '#HostParenthost',
                timeperiods: '#HostNotifyPeriodId',
                checkperiods: '#HostCheckPeriodId',
                contacts: '#HostContact',
                contactgroups: '#HostContactgroup'
            },
            dataPlaceholderEmpty: self.getVar('data_placeholder_empty'),
            dataPlaceholder: self.getVar('data_placeholder')
        });
        this.CustomVariables.setup({
            controller: 'Hosts',
            ajaxUrl: 'addCustomMacro',
            macrotype: 'HOST',
            onClick: function(){
                self.hosttemplateManager._onChangeMacro();
                self.hosttemplateManager._activateOrUpdateMacroRestore();
            }
        });


        var containerId = $('#HostContainerId').val();
        var hostID = $('#HostId').val();
        $.ajax({
            dataType: "json",
            url: '/hosts/loadParentHostsById/' + hostID + '.json',
            data: {
                'angular': true,
                'id': hostID
            },
            success: function(response){
                self.loadInitialData('#HostParenthost', response.parenthost);
            }
        });

        var ChosenAjaxObj = new ChosenAjax({
            id: 'HostParenthost' //Target select box
        });
        ChosenAjaxObj.setCallback(function(searchString){
            var selected = ChosenAjaxObj.getSelected();
            $.ajax({
                dataType: "json",
                url: '/hosts/loadParentHostsByString.json',
                data: {
                    'angular': true,
                    'filter[Host.name]': searchString,
                    'selected[]': selected,
                    'containerId': containerId,
                    'hostId': hostID
                },
                success: function(response){
                    ChosenAjaxObj.addOptions(response.hosts);
                    ChosenAjaxObj.setSelected(selected);
                }
            });
        });

        $('#yesDeleteHost').click(function(){
            var hostId = $(this).data('hostId');
            //ajax delete
            self.deleteHost(hostId);
        });

        ChosenAjaxObj.render();

        //get the containers for sharing
        if($('#HostSharedContainer').length){
            $('#HostContainerId').change(function(){
                var oldValue = $(this).attr('oldValue');
                var containerId = $(this).val();
                $(this).attr('oldValue', containerId);
                $.ajax({
                    url: '/Hosts/getSharingContainers/' + containerId + '.json',
                    type: 'post',
                    cache: false,
                    dataType: 'json',
                    complete: function(response){
                        $hostSharingContainer = $('#HostSharedContainer')
                        var prevSelectedContainer = $hostSharingContainer.val();
                        var res = response.responseJSON;
                        var html = '<select>';
                        for(var key in res){
                            var selected = '';
                            if(Array.isArray(prevSelectedContainer) && _.contains(prevSelectedContainer, key) || key == oldValue){
                                selected = 'selected';
                            }
                            html += '<option value="' + key + '" ' + selected + '>' + res[key] + '</option>';
                        }
                        html += '</select>';
                        $hostSharingContainer.html(html);
                        $hostSharingContainer.trigger('chosen:updated');
                    }
                });
            });
        }


        /*      var currentHosttemplateId = $('#HostHosttemplateId').val();
         var currentContainerId = $('#HostContainerId').val();

         $('#HostContainerId').change(function(){
         var newContainerId = $(this).val();
         console.log(newContainerId);
         console.log('changed');
         self.getContainerElements(newContainerId, currentHosttemplateId);
         });
         */
        var $inheritContacts = $('#inheritContacts');

        if($inheritContacts.prop('checked') == true){
            $('#hostContactSelects').block({
                message: null,
                overlayCSS: {
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    'background-color': 'rgb(255, 255, 255)'
                }
            });
        }

        /* Contact inherit stuff */
        $inheritContacts.click(function(){
            self.inherit();
        });

        if(this.getVar('ContactsInherited').inherit == true){
            $('#hostContactSelects').block({
                message: null,
                overlayCSS: {
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    'background-color': 'rgb(255, 255, 255)'
                }
            });
        }
        /* Contact inherit stuff end */


        var $inputs = $('#HostAddForm :input');
        var values = {};
        $inputs.each(function(){
            if(this.name.length > 0){
                values[this.name] = $(this).val();
            }
        });

        /*
         * Fix chosen width, if rendered in a tab
         */
        $("[data-toggle='tab']").click(function(){
            $('.chosen-container').css('width', '100%');
        });

        this.$contacts = $('#HostContact');
        this.$contactgroups = $('#HostContactgroup');
        this.$hostgroups = $('#HostHostgroup');

        this.lang = [];
        this.lang[1] = this.getVar('lang_minutes');
        this.lang[2] = this.getVar('lang_seconds');
        this.lang[3] = this.getVar('lang_and');

        this.initialized = false;

        this.fieldMap = {
            //Default HTML input fields
            description: 'Description',
            notes: 'Notes',
            host_url: 'HostUrl',
            command_id: 'CommandId',
            max_check_attempts: 'MaxCheckAttempts',

            //Fancy JavaScript junk
            tags: 'Tags',
            priority: 'stars-rating-5',

            //Sliders
            check_interval: 'Checkinterval',
            retry_interval: 'Retryinterval',
            notification_interval: 'Notificationinterval',

            //Checkboxes
            notify_on_recovery: 'NotifyOnRecovery',
            notify_on_down: 'NotifyOnDown',
            notify_on_unreachable: 'NotifyOnUnreachable',
            notify_on_flapping: 'NotifyOnFlapping',
            notify_on_downtime: 'NotifyOnDowntime',
            flap_detection_enabled: 'FlapDetectionEnabled',
            flap_detection_on_up: 'FlapDetectionOnUp',
            flap_detection_on_down: 'FlapDetectionOnDown',
            flap_detection_on_unreachable: 'FlapDetectionOnUnreachable',
            active_checks_enabled: 'ActiveChecksEnabled',

            //Selectboxes
            command_id: 'CommandId',
            check_period_id: 'CheckPeriodId',
            notify_period_id: 'NotifyPeriodId',
            contact: 'Contact',
            contactgroup: 'Contactgroup',
            hostgroup: 'Hostgroup'
        };

        // Render fancy tags input
        this.$tagsinput = $('.tagsinput');
        this.$tagsinput.tagsinput();

        // Flapdetection checkbox control
        $('input[type="checkbox"]#HostFlapDetectionEnabled').on('change.flapDetect', this.checkFlapDetection);

        this.checkFlapDetection();

        // Set the placeholder values to the input this.fields (if required)
        this.inputPlaceholder();
        $('input[type="checkbox"]#autoDNSlookup').on('change.inputPlaceholder', function(){
            if($('input[type="checkbox"]#autoDNSlookup').prop('checked') == true){
                $.cookie('oitc_autoDNSlookup', 'true', {expires: 365});
            }else{
                $.cookie('oitc_autoDNSlookup', 'false', {expires: 365});
            }

            this.inputPlaceholder();
        }.bind(this));

        // Automatically DNS lookup after the hostname has changed
        $('#HostName').focusout(function(){
            if($('input[type="checkbox"]#autoDNSlookup').prop('checked')){
                $('.ajax_icon').remove();
                var icon = '<i class="fa fa-warning fa-lg txt-color-redLight ajax_icon"></i> ';
                $hostname = $('#HostName');
                $label = $hostname.parent().parent().find('label');
                $note = $hostname.parent();

                var callback = function(response){
                    if(response.responseText != ''){
                        $('#HostAddress').val(response.responseText);
                        this.Highlight.highlight($('#HostAddress').parent());
                    }else{
                        $label.html(icon + $label.html());
                        $note.append('<span class="note ajax_icon">' + this.getVar('dns_hostname_lookup_failed') + '</span>');
                    }
                    this.Ajaxloader.hide();
                }.bind(this);

                if($hostname.val() != ''){
                    this.Ajaxloader.show();
                    ret = $.ajax({
                        url: "/Hosts/gethostbyname",
                        type: "POST",
                        cache: false,
                        data: "hostname=" + encodeURIComponent($hostname.val()),
                        error: function(){
                        },
                        success: function(){
                        },
                        complete: callback
                    });
                }
            }
        }.bind(this));

        // Automatically host FQDN DNS lookup after a ip address was typed in
        $('#HostAddress').focusout(function(){
            if($('input[type="checkbox"]#autoDNSlookup').prop('checked')){
                $('.ajax_icon').remove();
                var icon = '<i class="fa fa-warning fa-lg txt-color-redLight ajax_icon"></i> ';
                $hostaddress = $('#HostAddress');
                $label = $hostaddress.parent().parent().find('label');
                $note = $hostaddress.parent();
                var callback = function(response){
                    if(response.responseText != ''){
                        $('#HostName').val(response.responseText);
                        this.Highlight.highlight($('#HostName').parent());
                    }else{
                        $label.html(icon + $label.html());
                        $note.append('<span class="note ajax_icon">' + this.getVar('dns_ipaddress_lookup_failed') + '</span>');
                    }
                    this.Ajaxloader.hide();
                }.bind(this);
                if($hostaddress.val() != ''){
                    this.Ajaxloader.show();
                    ret = $.ajax({
                        url: "/Hosts/gethostbyaddr",
                        type: "POST",
                        cache: false,
                        data: "address=" + encodeURIComponent($hostaddress.val()),
                        error: function(){
                        },
                        success: callback,
                        complete: callback
                    });
                }
            }
        }.bind(this));

        var onSlideStop = function(ev){
            if(ev.value == null){
                ev.value = 0;
            }

            $('#_' + $(this).attr('id')).val(ev.value);
            $(this)
                .val(ev.value)
                .trigger('change');
            var min = parseInt(ev.value / 60, 10);
            var sec = parseInt(ev.value % 60, 10);
            $($(this).attr('human')).html(min + " " + self.lang[1] + " " + self.lang[3] + " " + sec + " " + self.lang[2]);
        };

        // Initialize the right value for the hidden input field.
        var $hostNotificationIntervalField = $('#HostNotificationinterval');

        var $slider = $('input.slider');
        $slider.slider({tooltip: 'hide'});
        $slider.slider('on', 'slide', onSlideStop);
        $slider.slider('on', 'slideStop', onSlideStop);

        // Input this.fieldMap for sliders
        var onChangeSliderInput = function(){
            var $this = $(this);
            $('#' + $this.attr('slider-for'))
                .slider('setValue', parseInt($this.val(), 10))
                .val($this.val())
                .attr('value', $this.val())
                .trigger('change');
            $hostNotificationIntervalField.trigger('change');
            var min = parseInt($this.val() / 60, 10);
            var sec = parseInt($this.val() % 60, 10);
            $($this.attr('human')).html(min + " " + self.lang[1] + " " + self.lang[3] + " " + sec + " " + self.lang[2]);
        };
        $('.slider-input')
            .on('change.slider', onChangeSliderInput)
            .on('keyup', onChangeSliderInput);

        // Render fancy tags input
        //$('.tagsinput').tagsinput();

        /*
         * Bind change event for the check command selectbox
         */
        $('#HostCommandId').on('change.hostCommand', function(){
            self.loadParametersByCommandId($(this).val(), $('#HostHosttemplateId').val());
            //self.loadParameters($(this).val());
        });

        /**
         * Mainly does two things:
         *
         *    1.    Fills up the input fields of the form. The values are used from the chosen Hosttemplate.
         *        This part was refactored.
         *
         *    2.    Allows to reset the values to their defaults. The defaults depend on the chosen Hosttemplate.
         *        This part was newly created.
         *
         *    onChangeField()            - When a field gets changed, this method will be called.
         *    onClickRestoreDefault()    - A click on the restore button.
         */
        self.hosttemplateManager = {
            isRestoreFunctionalityInitialized: false,
            isInitializedOnce: false,

            /**
             * Initialize the event listeners.
             */
            init: function(){
                this.updateHosttemplateValues(	// Updates the fields based on the decision of the user/template.
                    this.initRestoreDefault		// Initializes the restore functionality after the template values have been loaded.
                );
            },

            _onChangeMacro: function(){
                var currentValueCount = 0,
                    allCurrentValues = {},
                    caseInsensitive = true; // Thats the default value. It isn't configurable yet.

                var $customVariablesContainer = $('#customVariablesContainer');
                $customVariablesContainer.children().each(function(index){
                    var name = $(this).find('.macroName').val();
                    var value = $(this).find('.macroValue').val();
                    if(caseInsensitive){
                        allCurrentValues[name.toUpperCase()] = value.toUpperCase();
                    }else{
                        allCurrentValues[name] = value;
                    }
                    currentValueCount++;
                });

                var templateValues = {};
                for(var key in self.hosttemplateManager.currentCustomVariables){
                    var obj = self.hosttemplateManager.currentCustomVariables[key];
                    if(caseInsensitive){
                        templateValues[obj.name.toUpperCase()] = obj.value.toUpperCase();
                    }else{
                        templateValues[obj.name] = obj.value;
                    }
                }

                var isIdenticalWithTemplate = true;
                if(Object.keys(templateValues).length != currentValueCount){
                    isIdenticalWithTemplate = false;
                }
                if(isIdenticalWithTemplate){
                    for(var name in templateValues){
                        if(!allCurrentValues.hasOwnProperty(name)){
                            isIdenticalWithTemplate = false;
                            break;
                        }

                        if(templateValues[name] !== allCurrentValues[name]){
                            isIdenticalWithTemplate = false;
                            break;
                        }
                    }
                }

                self.hosttemplateManager._createOrUpdateMacroRestoreIcon(isIdenticalWithTemplate);
            },

            _restoreHostMacrosFromTemplate: function(){
                //Loading the macros of the hosttemplate
                self.CustomVariables.loadMacroFromTemplate(
                    self.hosttemplateManager.currentTemplate.id,
                    self.hosttemplateManager._activateOrUpdateMacroRestore
                );
            },

            _createOrUpdateMacroRestoreIcon: function(isIdenticalWithTemplate){
                var $macroContainer = $('.host-macro-settings'),
                    $icon = $macroContainer.find('.fa-chain-default, .fa-chain-non-default'),
                    defaultClasses = 'fa fa-chain margin-left-10 ',
                    greenIconClass = defaultClasses + 'txt-color-green fa-chain-default',
                    redIconClass = defaultClasses + 'txt-color-red fa-chain-non-default',
                    currentIconClass = (isIdenticalWithTemplate ? greenIconClass : redIconClass);

                if(!$icon.length){ // Create icon.
                    $icon = $('<i>', {
                        class: currentIconClass
                    });
                    $macroContainer.prepend($icon);
                }

                if(!isIdenticalWithTemplate){
                    $icon.off('click');
                    $icon.on('click', self.hosttemplateManager._restoreHostMacrosFromTemplate);
                }

                // Update the class of the icon.
                $icon.attr('class', (isIdenticalWithTemplate ? greenIconClass : redIconClass));
            },

            _activateOrUpdateMacroRestore: function(response){ // Called once a template is chosen.
                var $customVariablesContainer = this;
                var allCurrentValues = {};
                $('#customVariablesContainer').children().each(function(index){
                    var fields = {
                        $name: $(this).find('.macroName'),
                        $value: $(this).find('.macroValue')
                    };

                    allCurrentValues[fields.$name.val()] = fields.$value.val();

                    for(var key in fields){
                        if(!fields.hasOwnProperty(key)){
                            continue;
                        }
                        var $field = fields[key];

                        $field
                            .off('change.restoreDefault')
                            .off('keyup')
                            .on('change.restoreDefault', self.hosttemplateManager._onChangeMacro)
                            .on('keyup', self.hosttemplateManager._onChangeMacro);

                        // 		self.hosttemplateManager._onChangeMacro();
                    }
                });
                self.hosttemplateManager._onChangeMacro();

                // The event has to be used through "document". This is because the original function is attached the same way.
                // Otherwise it is executed before the original delete function is executed!
                $(document).off('click.macroRemove', '.deleteMacro');
                $(document).on('click.macroRemove', '.deleteMacro', self.hosttemplateManager._onChangeMacro);
            },

            deactivateRestoreFunctionality: function(){
                for(var key in self.fieldMap){
                    var fieldId = 'Host' + self.fieldMap[key];
                    var $field = $('#' + fieldId);
                    var $fieldFormGroup = $field.parents('.form-group');

                    $fieldFormGroup.find('input, select')
                        .not('[type="hidden"]')
                        .not('[type="checkbox"]')
                        .off('change.restoreDefault');
                    $fieldFormGroup.find('.fa-chain, .fa-chain-broken')
                        .remove();
                }

                var $hostMacroSettings = $('.host-macro-settings');
                $hostMacroSettings.find('.fa-chain-default, .fa-chain-non-default').remove();
                $hostMacroSettings.off('click.MacroRemove', '.deleteMacro');

                self.hosttemplateManager.isRestoreFunctionalityInitialized = false;
            },

            onClickRestoreDefault: function(){
                var $field = $(this);
                var fieldType = self.hosttemplateManager.getFieldType($field);
                var inputId = $field.attr('id') || '';
                var keyName;
                if(inputId.match(/stars-rating/)){
                    keyName = getObjectKeyByValue(self.fieldMap, 'stars-rating-5');
                }else{
                    keyName = getObjectKeyByValue(self.fieldMap, inputId.replace(/^(Host)/, ''));
                }
                var templateDefaultValue = self.hosttemplateManager.currentTemplate[keyName];
                if(typeof templateDefaultValue === 'undefined'){
                    templateDefaultValue = $field.prop('data-template-default');
                }
                if(in_array(keyName, ['contact', 'contactgroup', 'hostgroup'])){
                    switch(keyName){
                        case 'contact':
                            templateDefaultValue = self.hosttemplateManager.currentContact.map(function(elem){
                                return elem.id
                            });
                            break;
                        case 'contactgroup':
                            templateDefaultValue = self.hosttemplateManager.currentContactGroup.map(function(elem){
                                return elem.id
                            });
                            break;
                        case 'hostgroup':
                            templateDefaultValue = self.hosttemplateManager.currentHostGroup.map(function(elem){
                                return elem.id
                            });
                            break;
                    }
                }
                // console.log('onClickRestoreDefault()');
                if($field.prop('disabled')){
                    return;
                }
                if(fieldType === 'checkbox'){
                    // FIX: Values like '1', '0', true and false have to be parsed here.
                    if(templateDefaultValue == '0'){
                        templateDefaultValue = false;
                    }else{
                        templateDefaultValue = !!templateDefaultValue;
                    }

                    $field
                        .prop('checked', templateDefaultValue)
                        .trigger('change');
                }else if(fieldType === 'select'){ // The tag is a <select>
                    $field
                        .val(templateDefaultValue)
                        .trigger('chosen:updated')
                        .trigger('change');
                }else if(fieldType === 'radio'){
                    $field.parent().find('input').each(function(){
                        if($(this).val() != templateDefaultValue){
                            return;
                        }

                        $(this)
                            .prop('checked', true)
                            .trigger('change');
                    });
                }else if($field.hasClass('slider')){
                    var $otherInput = $field.parents('.form-group').find('input[type=number]');
                    $otherInput
                        .val(templateDefaultValue)
                        .trigger('change');
                    $field.trigger('change');
                }else if($field.hasClass('tagsinput')){ // Tags input field
                    var tags = templateDefaultValue.split(',');
                    $field.tagsinput('removeAll');
                    for(var key in tags){
                        $field.tagsinput('add', tags[key]);
                    }
                }else{ // Normal (text) input field
                    $field
                        .val(templateDefaultValue)
                        .trigger('change'); // Trigger the "change" event
                }
            },

            getFieldType: function($field){
                var fieldType = $field.attr('type');
                if(!fieldType){
                    fieldType = $field.prop('tagName').toLowerCase();
                }
                return fieldType;
            },

            onChangeField: function(event){
                var $field = $(this);
                var $label = null;
                var inputId = $field.attr('id') || '';
                var keyName;
                if(inputId.match(/stars-rating/)){
                    keyName = getObjectKeyByValue(self.fieldMap, 'stars-rating-5');
                }else{
                    keyName = getObjectKeyByValue(self.fieldMap, inputId.replace(/^(Host)/, ''));
                }
                var templateDefaultValue = self.hosttemplateManager.currentTemplate[keyName];
                var templateDefaultTitle = '';
                if(typeof templateDefaultValue === 'undefined'){
                    templateDefaultValue = $field.prop('data-template-default');
                }
                if(in_array(keyName, ['contact', 'contactgroup', 'hostgroup'])){
                    switch(keyName){
                        case 'contact':
                            templateDefaultValue = self.hosttemplateManager.currentContact.map(function(elem){
                                return elem.id
                            });
                            templateDefaultTitle = self.hosttemplateManager.currentContact.map(function(elem){
                                return elem.name
                            });
                            break;
                        case 'contactgroup':
                            templateDefaultValue = self.hosttemplateManager.currentContactGroup.map(function(elem){
                                return elem.id
                            });
                            templateDefaultTitle = self.hosttemplateManager.currentContactGroup.map(function(elem){
                                return elem.Container.name
                            });
                            break;
                        case 'hostgroup':
                            templateDefaultValue = self.hosttemplateManager.currentHostGroup.map(function(elem){
                                return elem.id
                            });
                            templateDefaultTitle = self.hosttemplateManager.currentHostGroup.map(function(elem){
                                return elem.Container.name
                            });
                            break;
                    }
                    templateDefaultTitle = templateDefaultTitle.join(', ');
                }
                var fieldType = self.hosttemplateManager.getFieldType($field);
                var nonDefaultClassName = 'fa fa-chain-broken fa-chain-non-default txt-color-red';
                var defaultClassName = 'fa fa-chain fa-chain-default txt-color-green';
                var defaultTitle = 'Default value';
                var restoreDefaultTitle;
                if(templateDefaultTitle != ''){
                    restoreDefaultTitle = 'Restore template default: "' + templateDefaultTitle + '"';
                }else{
                    restoreDefaultTitle = 'Restore template default: "' + templateDefaultValue + '"';
                }

                // "null" is no restorable default. Instead it's treated like "do nothing for this field".
                if(typeof templateDefaultValue === 'undefined' || templateDefaultValue === null){
                    return;
                }

                // Get the value of the field
                var fieldValue = null;
                switch(fieldType){
                    case 'checkbox':
                        // FIX: Values like '1', '0', true and false have to be parsed here.
                        if(templateDefaultValue == '0'){
                            templateDefaultValue = false;
                        }else{
                            templateDefaultValue = !!templateDefaultValue;
                        }

                        fieldValue = $field.is(':checked');
                        break;

                    case 'radio':
                        fieldValue = $field.parents('.form-group').find('[name="' + $field.attr('name') + '"]:checked').val();
                        break;

                    case 'select':
                        fieldValue = $field.val();
                        if(in_array(keyName, ['contact', 'contactgroup', 'hostgroup'])){
                            if(fieldValue === null){
                                fieldValue = [];
                            }
                        }else{
                            restoreDefaultTitle = 'Restore default: "' + $field.find('option[value="' + templateDefaultValue + '"]').text() + '"';
                        }
                        break;

                    default:
                        fieldValue = $field.val();
                        break;
                }

                if(fieldValue === null){
                    return;
                }

                var wrappedOnClickRestore = function(){
                    self.hosttemplateManager.onClickRestoreDefault.call($field);
                };
                var $restoreDefaultIcon = $field.parents('.form-group').find('.fa-chain, .fa-chain-broken');
                var isEqual = (is_scalar(fieldValue) && is_scalar(templateDefaultValue) && fieldValue == templateDefaultValue) ||
                    (is_array(fieldValue) && is_array(templateDefaultValue) && is_array_equal(fieldValue, templateDefaultValue));
                if(isEqual){
                    if(!$restoreDefaultIcon.length){ // Icon doesn't exist -> create one
                        $restoreDefaultIcon = $('<i>', {
                            'class': defaultClassName,
                            'title': defaultTitle
                        });
                        $field.parents('.form-group').append($restoreDefaultIcon);
                    }else{ // Icon exists already
                        $restoreDefaultIcon
                            .attr({
                                'class': defaultClassName,
                                'title': defaultTitle
                            })
                            .off('click')
                    }
                }else{
                    if(!$restoreDefaultIcon.length){ // Icon doesn't exist -> create one
                        $restoreDefaultIcon = $('<i>', {
                            'class': nonDefaultClassName,
                            'title': restoreDefaultTitle
                        });
                        $restoreDefaultIcon.on('click', wrappedOnClickRestore);
                        $field.parents('.form-group').append($restoreDefaultIcon);
                    }else{ // Icon exists already
                        $restoreDefaultIcon
                            .attr({
                                'class': nonDefaultClassName,
                                'title': restoreDefaultTitle
                            })
                            .off('click')
                            .on('click', wrappedOnClickRestore)
                    }
                }
            },

            /**
             * Initalizes the restore functionality. The default values depend on the chosen Hosttemplate.
             */
            initRestoreDefault: function(){
                //self.hosttemplateManager.deactivateRestoreFunctionality();
                // console.log('initRestoreDefault()');
                // Bind on all predefined inputs to allow to restore their defaults.
                for(var key in self.fieldMap){
                    if(!self.fieldMap.hasOwnProperty(key)){
                        return;
                    }
                    var $field = $('#Host' + self.fieldMap[key]);
                    var fieldType = $field.attr('type');
                    if(!fieldType){
                        fieldType = $field.prop('tagName').toLowerCase();
                    }

                    switch(fieldType){
                        case 'text':
                        case 'checkbox':
                            self.hosttemplateManager.onChangeField.call($field); // Call once for this field
                            $field.on('change.restoreDefault', self.hosttemplateManager.onChangeField);
                            $field.on('keyup', self.hosttemplateManager.onChangeField);
                            break;

                        case 'radio':
                            var $radioFields = $field.parents('.form-group').find('[name="' + $field.attr('name') + '"]');
                            $radioFields.each(function(){
                                self.hosttemplateManager.onChangeField.call($(this));
                                $(this).on('change.restoreDefault', function(){
                                    self.hosttemplateManager.onChangeField.call($(this));
                                });
                            });
                            break;

                        case 'select':
                            self.hosttemplateManager.onChangeField.call($field);
                            $field.on('change.restoreDefault', self.hosttemplateManager.onChangeField);
                            break;

                        // case 'checkbox':
                        //	break;

                        case 'number':
                            break;
                        case 'hidden':
                            break;
                        case 'submit':
                            break;
                        default:
                            break;
                    }
                }
                self.hosttemplateManager.isRestoreFunctionalityInitialized = true;
                self.hosttemplateManager.isInitializedOnce = true;
            },

            updateHosttemplateValues: function(onComplete){
                self.hosttemplateManager.currentTemplate = {};
                var $selectBoxHosttemplate = $('#HostHosttemplateId');

                var ajaxCompleteCallback = function(response){
                    // console.log(response.responseJSON);
                    var responseObject = response.responseJSON;
                    if(responseObject.code === 'not_authenticated' || responseObject.hosttemplate.length == 0){
                        return;
                    }
                    var hosttemplateId = $selectBoxHosttemplate.val();

                    self.hosttemplateManager.currentTemplate = responseObject.hosttemplate.Hosttemplate;
                    self.hosttemplateManager.currentContact = responseObject.hosttemplate.Contact;
                    self.hosttemplateManager.currentContactGroup = responseObject.hosttemplate.Contactgroup;
                    self.hosttemplateManager.currentCustomVariables = responseObject.hosttemplate.Customvariable;
                    self.hosttemplateManager.currentHostGroup = responseObject.hosttemplate.Hostgroup;

                    // For debugging purposes only // TODO remove before commit
                    window.currentTemplate = responseObject.hosttemplate.Hosttemplate;
                    window.currentContact = responseObject.hosttemplate.Contact;
                    window.currentContactGroup = responseObject.hosttemplate.Contactgroup;
                    window.currentCompleteHosttemplate = responseObject.hosttemplate;
                    window.currentCustomVariable = responseObject.hosttemplate.Customvariable;
                    window.currentHostGroup = responseObject.hosttemplate.Hostgroup;

                    if(self.hosttemplateManager.currentTemplate.id != hosttemplateId){
                        self.Ajaxloader.hide();

                        return;
                    }

                    if(self.hosttemplateManager.isInitializedOnce){ // After it was initialized once, replace the values
                        // Update the interface input self.fieldMap out of the hosttemplate JSON data
                        for(var key in self.fieldMap){
                            var templateDefaultValue = self.hosttemplateManager.currentTemplate[key];

                            if(key == 'priority'){
                                $('#Hoststars-rating-' + templateDefaultValue)
                                    .prop('checked', true)
                                    .parents('.form-group').find('input[type=radio]') // All input fields get the data-template-default property
                                    .prop('data-template-default', templateDefaultValue);
                            }else if(key == 'tags'){
                                self.updateTags({tags: templateDefaultValue});
                            }else if(in_array(key, ['check_interval', 'retry_interval', 'notification_interval'])){
                                self.updateSlider({
                                    value: templateDefaultValue,
                                    selector: self.fieldMap[key]
                                });
                            }else if(in_array(key, ['notify_period_id', 'check_period_id', 'command_id'])){
                                self.updateSelectbox({value: templateDefaultValue, selector: self.fieldMap[key]});
                            }else if(in_array(key, [
                                'notify_on_recovery', 'notify_on_down', 'notify_on_unreachable',
                                'notify_on_flapping', 'notify_on_downtime', 'flap_detection_enabled',
                                'flap_detection_on_unreachable', 'flap_detection_on_down', 'flap_detection_on_up',
                                'active_checks_enabled'
                            ])){
                                //modifying value for fancy checkboxes
                                self.updateCheckbox({value: templateDefaultValue, selector: self.fieldMap[key]});
                            }else{
                                //modifying value for default input this.fields
                                $('#Host' + self.fieldMap[key]).val(templateDefaultValue);
                            }
                        }

                        //Updating associated data
                        //Contacts
                        var selectedContacts = [];
                        $(responseObject.hosttemplate.Contact).each(function(intIndex, jsonContact){
                            selectedContacts.push(jsonContact.id);
                        });
                        self.updateSelectbox({value: selectedContacts, selector: '#HostContact', prefix: 'false'});

                        //Contactgroups
                        var selectedContactgroups = [];
                        $(responseObject.hosttemplate.Contactgroup).each(function(intIndex, jsonContactgroup){
                            selectedContactgroups.push(jsonContactgroup.id);
                        });
                        self.updateSelectbox({
                            value: selectedContactgroups,
                            selector: '#HostContactgroup',
                            prefix: 'false'
                        });

                        //Hostgroups
                        var selectedHostgroups = [];
                        $(responseObject.hosttemplate.Hostgroup).each(function(intIndex, jsonHostgroup){
                            selectedHostgroups.push(jsonHostgroup.id);
                        });
                        self.updateSelectbox({value: selectedHostgroups, selector: '#HostHostgroup', prefix: 'false'});

                    }

                    // Loading the macros of the hosttemplate if no own macros exist. Otherwise only create the
                    // restore icon.
                    var hostHasOwnMacros = $('.host-macro-settings').find('input[type=hidden]').length > 0;
                    if(hostHasOwnMacros){
                        self.hosttemplateManager._activateOrUpdateMacroRestore();
                    }else{
                        self.CustomVariables.loadMacroFromTemplate(
                            self.hosttemplateManager.currentTemplate.id,
                            self.hosttemplateManager._activateOrUpdateMacroRestore
                        );
                    }

                    //Loading command arguments of the template
                    //self.loadParametersFromTemplate(self.hosttemplateManager.currentTemplate.id);
                    self.Ajaxloader.hide();

                    onComplete(); // Gets called only for the first AJAX request
                };

                var onChangeHosttemplate = function(){
                    self.hosttemplateManager.isRestoreFunctionalityInitialized = true;
                    var hosttemplateId = $(this).val();
                    if(hosttemplateId <= 0){
                        self.hosttemplateManager.currentTemplate = {};
                        self.hosttemplateManager.deactivateRestoreFunctionality();

                        return false;
                    }

                    $('#content').find('.fa-link').remove(); // Removes all elements with class fa-link
                    self.Ajaxloader.show();

                    $.ajax({
                        url: "/Hosts/loadHosttemplate/" + encodeURIComponent(hosttemplateId) + '.json',
                        type: "POST",
                        cache: false,
                        dataType: "json",
                        error: function(){
                        },
                        success: function(){
                        },
                        complete: ajaxCompleteCallback
                    });
                };

                // Call first time (without change) because it may be selected!
                if(parseInt($selectBoxHosttemplate.val(), 10) > 0){
                    onChangeHosttemplate.call($selectBoxHosttemplate);
                }else{
                    self.hosttemplateManager.isInitializedOnce = true;
                }

                // Bind change event on the hosttemplate selectbox and load the template settings
                $selectBoxHosttemplate.on('change.hostTemplate', function(){
                    onChangeHosttemplate.call(this);
                    self.loadParametersFromTemplate($(this).val());
                });
                //$selectBoxHosttemplate.on('change.hostTemplate', onChangeHosttemplate);

                // Bind change event for the check command selectbox
                /*$('#HostCommandId').on('change.hostCommand', function(){
                 self.loadParameters($(this).val());
                 });*/
                if($('#HostCommandId').val() !== null && $('#HostHosttemplateId').val() != 0){
                    //self.loadParametersFromTemplate($('#HostHosttemplateId').val());
                }
            }
        };

        self.hosttemplateManager.init();
    },


    loadInitialData: function(selector, selectedHostIds){
        var containerId = $('#HostContainerId').val();
        var self = this;

        if(selectedHostIds == null || selectedHostIds.length < 1){
            selectedHostIds = [];
        }else{
            if(!Array.isArray(selectedHostIds)){
                selectedHostIds = [selectedHostIds];
            }
        }

        $.ajax({
            dataType: "json",
            url: '/hosts/loadParentHostsByString.json',
            data: {
                'angular': true,
                'selected[]': selectedHostIds, //ids
                'containerId': containerId,
                'hostId': $('#HostId').val()
            },
            success: function(response){
                var $selector = $(selector);
                var list = self.buildList(response.hosts);
                $selector.append(list);
                $selector.val(selectedHostIds);
                $selector.trigger('chosen:updated');
            }
        });
    },

    buildList: function(data){
        var html = '';
        for(var i in data){
            html += '<option value="' + data[i].key + '">' + htmlspecialchars(data[i].value) + '</option>';
        }
        return html;
    },

    inputPlaceholder: function(){
        var $checkbox = $('input[type="checkbox"]#autoDNSlookup');
        if($.cookie('oitc_autoDNSlookup') == 'false'){
            $checkbox.prop('checked', false);
            $('#HostName').attr('placeholder', '');
            $('#HostAddress').attr('placeholder', '');
            return;
        }

        if($checkbox.prop('checked')){
            $('#HostName').attr('placeholder', this.getVar('hostname_placeholder'));
            $('#HostAddress').attr('placeholder', this.getVar('address_placeholder'));
            $.cookie('oitc_autoDNSlookup', 'true', {expires: 365});
        }else{
            $('#HostName').attr('placeholder', '');
            $('#HostAddress').attr('placeholder', '');
            $.cookie('oitc_autoDNSlookup', 'false', {expires: 365});
        }
    },

    checkFlapDetection: function(){
        var disable = false;
        if(!$('input[type="checkbox"]#HostFlapDetectionEnabled').prop('checked')){
            disable = true;
        }
        $('.flapdetection_control').prop('disabled', disable);
    },

    updateTags: function(_options){
        var options = _options || {};
        options.tags = _options.tags || "";
        options.remove = _options.remove || true;

        if(options.remove === true){
            this.$tagsinput.tagsinput('removeAll');
        }
        this.$tagsinput.tagsinput('add', options.tags);
    },

    updateSlider: function(_options){

        var options = _options || {};
        options.value = parseInt(_options.value, 10) || 0;
        options.selector = _options.selector || null;
        $('#Host' + options.selector).slider('setValue', options.value);
        $('#_Host' + options.selector).val(options.value);
        $('#Host' + options.selector).val(options.value);
        $('_#Host' + options.selector).trigger('keyup');

        $helptext = $('#Host' + options.selector + '_human');

        min = parseInt(options.value / 60, 10);
        sec = parseInt(options.value % 60, 10);
        $helptext.html(min + " " + this.lang[1] + " " + this.lang[3] + " " + sec + " " + this.lang[2]);
    },

    updateCheckbox: function(_options){
        var options = _options || {};
        options.value = _options.value || null;
        options.selector = _options.selector || '';

        if(options.value === null || options.value == 0 || options.value == false){
            $('input[type="checkbox"]#Host' + options.selector).prop('checked', false).trigger('change');
            this.checkFlapDetection();
            return false;
        }

        $('input[type="checkbox"]#Host' + options.selector).prop('checked', true).trigger('change');

        this.checkFlapDetection();
        return true;
    },

    updateSelectbox: function(_options){
        var options = _options || {};
        options.value = _options.value || 0;
        options.selector = _options.selector || '';
        options.prefix = _options.prefix || "#Host";

        if(options.prefix == 'false'){
            options.prefix = '';
        }

        $(options.prefix + options.selector).val(options.value);
        $(options.prefix + options.selector).trigger("chosen:updated").change();
    },

    loadParametersByCommandId: function(command_id, hosttemplate_id){
        this.Ajaxloader.show();
        $.ajax({
            url: "/Hosts/loadParametersByCommandId/" + encodeURIComponent(command_id) + "/" + encodeURIComponent(hosttemplate_id),
            type: "POST",
            cache: false,
            error: function(){
            },
            success: function(){
            },
            complete: function(response){
                $('#CheckCommandArgs').html(response.responseText);
                this.Ajaxloader.hide();
            }.bind(this)
        });
    },

    loadParameters: function(command_id){
        this.Ajaxloader.show();
        $.ajax({
            url: "/Hosts/loadArgumentsAdd/" + encodeURIComponent(command_id),
            type: "POST",
            cache: false,
            error: function(){
            },
            success: function(){
            },
            complete: function(response){
                $('#CheckCommandArgs').html(response.responseText);
                this.Ajaxloader.hide();
            }.bind(this)
        });
    },

    loadParametersFromTemplate: function(hosttemplate_id){
        $.ajax({
            url: "/Hosts/loadHosttemplatesArguments/" + encodeURIComponent(hosttemplate_id),
            type: "POST",
            cache: false,
            error: function(){
            },
            success: function(){
            },
            complete: function(response){
                $('#CheckCommandArgs').html(response.responseText);
                this.Ajaxloader.hide();
            }.bind(this)
        });
    },

    inherit: function(){
        $inheritCheckbox = $('#inheritContacts');
        if($inheritCheckbox.prop('checked') == true){
            $('#hostContactSelects').block({
                message: null,
                overlayCSS: {
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    'background-color': 'rgb(255, 255, 255)'
                }
            });

            //Set selected in selectbox for contacs

            var Contact = this.getVar('ContactsInherited').Contact;

            if(Contact != null){
                $('#HostContact').val('').trigger('chosen:updated');
                for(var contactId in Contact){
                    if($('#HostContact option[value="' + contactId + '"]').length > 0){
                        $('#HostContact option[value="' + contactId + '"]')
                            .val(contactId)
                            .prop('selected', true)
                    }
                }
                $('#HostContact').trigger('chosen:updated');
            }

            //Set selected in selectbox for contact groups
            var Contactgroup = this.getVar('ContactsInherited').Contactgroup;
            if(Contactgroup != null){
                $('#HostContactgroup').val('').trigger('chosen:updated');
                for(var ContactgroupId in Contactgroup){
                    if($('#HostContactgroup option[value="' + ContactgroupId + '"]').length > 0){
                        $('#HostContactgroup option[value="' + ContactgroupId + '"]')
                            .val(ContactgroupId)
                            .prop('selected', true)
                    }
                }
                $('#HostContactgroup').trigger('chosen:updated');
            }

            $('#HostContact').prop('readonly', true);
            $('#HostContactgroup').prop('readonly', true);
        }else{
            $('#hostContactSelects').unblock();
            $('#HostContact').prop('readonly', false);
            $('#hostContactgroupSelects').unblock();
            $('#HostContactgroup').prop('readonly', false);
        }
    },

    getContainerElements: function(containerId, hosttemplateId){
        this.Ajaxloader.show();
        $.ajax({
            url: '/Hosts/loadElementsByContainerId/' + containerId + '/' + encodeURIComponent(this.getVar('hostId')) + '.json',
            type: "POST",
            cache: false,
            error: function(){
            },
            success: function(){
            },
            complete: function(response){
                this.compareContainerElements(response.responseJSON, hosttemplateId);
                console.log(response.responseJSON);

                this.Ajaxloader.hide();
            }.bind(this)
        });
    },

    compareContainerElements: function(obj, hosttemplateId){
        console.log(hosttemplateId);
        console.log(obj.hosttemplates);

        hosttemplateExists = false;
        for(var key in obj.hosttemplates){
            if(obj.hosttemplates[key].key == hosttemplateId){
                //hosttemplate exists in the new container so nothing must be changed
                hosttemplateExists = true;
            }
        }
        console.log(hosttemplateExists);

    },

    deleteHost: function(id){
        $.ajax({
            dataType: "json",
            url: '/hosts/delete/' + id + '.json',
            method: 'POST',
            data: {
                'angular': true
            },
            success: function(response){

                $('#successDelete').show();
                setTimeout(function(){
                    window.location.href = '/hosts/index/';
                }, 700);
            },
            error: function(request, status, error){
                var errorMsg = request.responseJSON.message;
                var usedBy = request.responseJSON.usedBy;

                var errorHtml = '<div class="text-danger">';
                errorHtml += '<div class="text-danger">' + errorMsg + '</div>';
                for(var key in usedBy){
                    errorHtml += '<div class="text-danger">';
                    errorHtml += '<i class="fa fa-times"></i>';
                    errorHtml += ' ';
                    errorHtml += '<a class="text-danger" href="' + usedBy[key].baseUrl + id + '">' + usedBy[key].message + '</a>';
                    errorHtml += '</div>';
                }
                errorHtml += '</div>';

                $('#errorOnDelete').html(errorHtml);

            }

        });

    }

});
