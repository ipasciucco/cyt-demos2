sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/FormattedText",
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/m/SearchField',
    'sap/m/Token',
    'sap/ui/model/type/String',
    'sap/m/ColumnListItem',
    'sap/m/Label',

],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Fragment, ODataModel, FormattedText, Filter, FilterOperator, SearchField, Token, TypeString, ColumnListItem, Label) {
        "use strict";

        return Controller.extend("com.cyt.zuxportalesbase2021111116.controller.Base", {
            onInit: function () {

            },

            onAfterRendering: function () {
                var loader = window.parent.loadingDiv
                if (loader) loader.style.display = "none"

                this._checkServices()
                    .then(r => {
                        var responseTexts = [];//["Missing IdPortal attribute", "Missing Admin group attribute"] //da error porque un usuario no tiene acceso a todos los portales. Si no tiene acceso a ninguno de los 3 debería dar error de todas formas.
                        var servicesFlags = []
                        var appLang = sap.ui.getCore().getConfiguration().getLanguage()

                        r.map(response => {
                            if (response.status !== 200 && !responseTexts.includes(response.responseText)) {
                                servicesFlags.push(response.service + " failed")
                            }
                        })

                        if (servicesFlags.length === 3) {

                            sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(service => {

                                service.hrefForExternalAsync({
                                    target: {
                                        semanticObject: appLang === "ES" ? "Mantenimiento" : "Maintenance",
                                        action: "Display"
                                    },
                                    params: {}
                                }).then((hash) => {
                                    service.toExternal({
                                        target: {

                                            shellHash: hash
                                        }
                                    })

                                })

                            })

                        }

                    })
            },

            onLinkPress: function (oEvent, oData) {
                if (oData.type === 'Link') {
                    window.open(oData.link, oData.action)
                } else if (oData.type === 'External') {
                    this.oCrossAppNav = sap.ushell.Container.getService(
                        "CrossApplicationNavigation"
                    );
                    this.oCrossAppNav.toExternal({
                        target: {
                            semanticObject: oData.link,
                            action: oData.action
                        }
                    });
                }
            },


            _clearModelFiltrosValueHelpProveedores: function () {
                this.getView().setModel(new JSONModel(), 'filtrosValueHelp');

                var oModel = this.getView().getModel('filtrosValueHelp')
                oModel.setProperty('/filtroCode', false)
                oModel.setProperty('/proveedores', {
                    Code: '',
                    Desc_2: '',
                });
            },


            handleValueHelpProveedores: function (oEvent) {

                this._clearModelFiltrosValueHelpProveedores()

                var oColModel = new JSONModel({
                    "cols": [{
                        "label": this.getView().getModel("i18n").getResourceBundle().getText("valueHelpLabelIDSAP"),
                        "template": "Code",
                    }, {
                        "label": this.getView().getModel("i18n").getResourceBundle().getText("valueHelpLabelProveedor"),
                        "template": "Desc_1",
                    }, {
                        "label": this.getView().getModel("i18n").getResourceBundle().getText("valueHelpLabelRut"),
                        "template": "Desc_2",
                    }]
                })
                var aCols = oColModel.getData().cols;


                this.getProveedoresBase();
                this._activeInput = oEvent.getSource().getId().split("--")[1]
                var multiInput = this.getView().byId(this._activeInput)

                this._oBasicSearchField = new SearchField({
                    showSearchButton: false,
                    placeholder: this.getView().getModel("i18n").getResourceBundle().getText("vendor.selectDialog.searchPlaceholder"),
                    //search: this.getProveedoresBase.bind(this)
                });

                var that = this;
                Fragment.load({
                    name: "com.cyt.zuxportalesbase2021111116.view.ValueHelpDialogProveedores",
                    controller: this
                }).then(function name(oFragment) {
                    this._oValueHelpDialog = oFragment;
                    this.getView().addDependent(this._oValueHelpDialog);

                    this._oValueHelpDialog.setRangeKeyFields([{
                        label: this.getView().getModel("i18n").getResourceBundle().getText("valueHelpLabelIDSAP"),
                        key: "Code",
                        type: "string",
                        typeInstance: new TypeString({}, {
                            maxLength: 12
                        })
                    }]);

                    var oFilterBar = that._oValueHelpDialog.getFilterBar();
                    // oFilterBar.setFilterBarExpanded(false);
                    oFilterBar.setBasicSearch(that._oBasicSearchField);

                    that._oValueHelpDialog.getTableAsync().then(function (oTable) {
                        oTable.setModel(that.getView().getModel());
                        oTable.setModel(oColModel, "columns");

                        oTable.attachFirstVisibleRowChanged({},
                            function (oEvent, data) {
                                if (oEvent.getParameter("firstVisibleRow") >= oEvent.getSource().getBinding().iLength - 10) {
                                    this.getProveedoresBase(this._oBasicSearchField.getValue(), that.getView().getModel().getProperty('/ProveedorCollection') ? that.getView().getModel().getProperty('/ProveedorCollection').length : 0);
                                }
                            }.bind(that)
                        )

                        if (oTable.bindRows) {
                            oTable.bindAggregation("rows", "/ProveedorCollection");
                        }

                        if (oTable.bindItems) {
                            oTable.bindAggregation("items", "/ProveedorCollection", function () {
                                return new ColumnListItem({
                                    cells: aCols.map(function (column) {
                                        return new Label({ text: "{" + column.template + "}" });
                                    })
                                });
                            });
                        }

                        that._oValueHelpDialog.update();
                    }.bind(this));

                    that._oValueHelpDialog.setTokens(multiInput.getTokens());
                    that._oValueHelpDialog.open();
                }.bind(this));
            },

            onValueHelpProveedoresOkPress: function (oEvent) {
                var aTokens = oEvent.getParameter("tokens");
                var oMultiInput = this.byId(this._activeInput);

                oMultiInput.setTokens(aTokens);
                this._oValueHelpDialog.close();

                oMultiInput.fireTokenUpdate()
            },

            onValueHelpProveedoresCancelPress: function () {
                this._oValueHelpDialog.close();
            },

            onValueHelpProveedoresAfterClose: function () {
                this._oValueHelpDialog.destroy();
            },

            onFilterBarSearchValueHelpProveedores: function (evt) {

                var sValue = this._oBasicSearchField.getValue();

                var that = this;
                clearTimeout(this.delayTimer);
                this.delayTimer = setTimeout(function () {
                    that.getProveedoresBase(sValue, 0);
                }, 1000);
            },

            getProveedoresBase: function (sValue = "", skip = 0) {

                var oModel = this.getView().getModel('filtrosValueHelp')

                var oFilter = oModel.getProperty('/proveedores');
                var filterProv = [];

                var filterProveedor = new Filter({ path: "Code", operator: FilterOperator.EQ, value1: 'Proveedor' })
                if (sValue && sValue !== "") {
                    filterProv.push(new Filter({ path: "Desc_1", operator: FilterOperator.Contains, value1: sValue.toUpperCase() }))
                }
                if (oFilter.Desc_2 && oFilter.Desc_2 !== "") {
                    filterProv.push(new Filter({ path: "Desc_2", operator: FilterOperator.Contains, value1: oFilter.Desc_2.toUpperCase() }))
                }

                filterProv.push(filterProveedor)
                var that = this;
                if (that._oValueHelpDialog) {
                    that._oValueHelpDialog.setBusy(true)
                }

                this.oDataModel.read('/ValueHelpSet', {
                    urlParameters: { "$top": 11, "$skip": skip },
                    filters: filterProv,
                    success: (data) => {
                        var proveedores = that.oModel.getProperty('/ProveedorCollection')
                        if (proveedores && skip > 0) {
                            proveedores = proveedores.concat(data.results)
                        } else {
                            proveedores = data.results
                        }
                        that.oModel.setProperty('/ProveedorCollection', proveedores)


                        if (that._oValueHelpDialog) {
                            that._oValueHelpDialog.setBusy(false)
                        }
                    },
                    error: (e) => {
                        MessageToast.show("{i18n>error}")
                        if (that._oValueHelpDialog) {
                            that._oValueHelpDialog.setBusy(false)
                        }
                    }
                })
            },

            firstVisibleRowChanged: function (oEvent) {
                this.getProveedoresBase(this._oBasicSearchField.getValue(), that.getView().getModel().getProperty('/ProveedorCollection') ? that.getView().getModel().getProperty('/ProveedorCollection').length : 0);
            },

            _filterTableValueHelpProveedores: function (oFilter) {
                var oValueHelpDialog = this._oValueHelpDialog;

                oValueHelpDialog.getTableAsync().then(function (oTable) {
                    if (oTable.bindRows) {
                        oTable.getBinding("rows").filter(oFilter);
                    }

                    if (oTable.bindItems) {
                        oTable.getBinding("items").filter(oFilter);
                    }

                    oValueHelpDialog.update();
                });
            },

            _checkServices: async function () {

                var appBaseUrl = jQuery.sap.getModulePath("com.cyt.zuxportalesbase2021111116");

                var p1 = new Promise((res, rej) => {
                    $.ajax({
                        url: appBaseUrl + "/proxy/ECC_CYT_HTTP_PORPAGCLI/sap/opu/odata/sap/ZGW_FI_PORT_CLIENTES_SRV/$metadata",
                        type: "GET",
                        complete: function (response) {
                            res({ service: "ECC_CYT_HTTP_PORPAGCLI", status: response.status, responseText: response.responseText })
                        }
                    })
                })

                var p2 = new Promise((res, rej) => {
                    $.ajax({
                        url: appBaseUrl + "/proxy/ECC_CYT_HTTP_PTALPROV/sap/opu/odata/sap/ZCL_MM_PORTAL_PRO_SRV/$metadata",
                        type: "GET",
                        complete: function (response) {
                            res({ service: "ECC_CYT_HTTP_PTALPROV", status: response.status, responseText: response.responseText })
                        }
                    })
                })


                var p3 = new Promise((res, rej) => {
                    $.ajax({
                        url: appBaseUrl + "/proxy/ECC_CYT_HTTP_PTALCLIEEXP/sap/opu/odata/sap/ZCL_QM_PORTAL_CLI_EXP_SRV/$metadata",
                        type: "GET",
                        complete: function (response) {
                            res({ service: "ECC_CYT_HTTP_PTALCLIEEXP", status: response.status, responseText: response.responseText })
                        }
                    })
                })

                return Promise.all([p1, p2, p3])
                    .then((responses) => {
                        return responses
                    })

            }


        });
    });

