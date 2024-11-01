


sap.ui.define([
    "./Base.controller",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Component",
    "sap/ui/core/ComponentLifecycle",
    "sap/m/Dialog",
    "sap/m/DialogType",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/FormattedText",
    'sap/ui/core/Fragment',
    "sap/ui/core/Popup",
    "sap/ui/core/library",
    'sap/ui/core/format/DateFormat',
    "sap/m/MessageToast",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Base, Device, JSONModel, Component, ComponentLifecycle, Dialog, DialogType, Button, ButtonType, Text, VBox, ODataModel, FormattedText, Fragment, Popup, coreLibrary, DateFormat, MessageToast) {
        "use strict";

        var ValueState = coreLibrary.ValueState;

        return Base.extend("com.cyt.zuxportalesbase2021111116.controller.MasterView", {

            onInit: function () {

                // const userEmail = sap.ushell.Container.getService("UserInfo").getEmail();
                // const userDomain = sap.ushell.Container.getService("UserInfo").getEmail().split('@')[1]
                // this.getLogonEmail();


                var language = localStorage.getItem("Language");
                if (language && (language === 'ES' || language === 'EN' || language === 'PT')) {
                    sap.ui.getCore().getConfiguration().setLanguage(language);
                } else {
                    localStorage.setItem("Language", 'EN');
                    sap.ui.getCore().getConfiguration().setLanguage('EN');
                }

                this.defCom = $.Deferred(); // Despues de traer los comunicados
                this.defRen = $.Deferred(); // Despues de renderizar
                this.defToSProv = $.Deferred(); // Al aceptar terminos del proveedor
                this.defToSCliE = $.Deferred(); // Al aceptar terminos del cliente exp
                this.defMenu = $.Deferred(); // Al crear el menu dinámico


                var isQA = window.location.href.includes("qa") ? "qa" : ""
                var splitURL = window.location.href.split("/")
                var splitDomain = splitURL[2].split(".");
                splitDomain[0] = "portal-autoregistro" + isQA
                splitURL[2] = splitDomain.join(".")
                this.urlAutoRegistro = splitURL.join("/") + "#/TermsOfService"


                var portal = {
                    portal: {
                        proveedores: false,
                        clientesExportacion: false,
                        pagoClientes: false,
                        onlyPagoClientes: false
                    }
                };

                var oPortal = new JSONModel(portal);
                this.getView().setModel(oPortal, 'portal');

                this.getView().setModel(new JSONModel())

                this.getView().setModel(new JSONModel(), 'ComunicadosBase')

                //Consumir srvicio OData
                var appBaseUrl = jQuery.sap.getModulePath("com.cyt.zuxportalesbase2021111116");

                //Las siguientes 2 lineas son nuevas(cuidado)
                var serviceDest = 'ECC_CYT_HTTP_PTALCLIEEXP';
                this.oDataModel = new ODataModel(appBaseUrl + '/proxy/' + serviceDest + '/sap/opu/odata/sap/ZCL_QM_PORTAL_CLI_EXP_SRV', { useBatch: false });

                var serviceDestProv = 'ECC_CYT_HTTP_PTALPROV';
                this.oDataModelProv = new ODataModel(appBaseUrl + '/proxy/' + serviceDestProv + '/sap/opu/odata/sap/ZCL_MM_PORTAL_PRO_SRV', { useBatch: false });

                var serviceDestPagos = 'ECC_CYT_HTTP_PORPAGCLI';
                this.oDataModelPagos = new ODataModel(appBaseUrl + '/proxy/' + serviceDestPagos + '/sap/opu/odata/sap/ZGW_FI_PORT_CLIENTES_SRV', { useBatch: false });

                this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle();

                $.ajax({
                    url: appBaseUrl + "/userinfo",
                    type: 'GET',
                    success: function (data) {

                        let userInfo = JSON.parse(data);
                        let newPortal = {
                            portal: {
                                proveedores: userInfo['xs.system.attributes']?.['xs.rolecollections']?.filter((rol) => rol.startsWith("Z_UX_LOGISTICA_PORTAL_PROVEEDORES")).length > 0,
                                clientesExportacion: userInfo['xs.system.attributes']?.['xs.rolecollections']?.filter((rol) => rol.startsWith("Z_UX_COMERCIAL_PORTAL_CLIENTES")).length > 0,
                                pagoClientes: userInfo['xs.system.attributes']?.['xs.rolecollections']?.filter((rol) => rol.startsWith("Z_UX_FINANZAS_PORTAL_PAGO_CLIENTES")).length > 0
                            }
                        };

                        newPortal.portal.onlyPagoClientes = newPortal.portal.pagoClientes && !newPortal.portal.proveedores && !newPortal.portal.clientesExportacion;

                        this.userInfo = userInfo;

                        var oNewPortal = new JSONModel(newPortal);
                        this.getView().setModel(oNewPortal, 'portal');

                        this._accionesPortalProveedores();
                        this._accionesPortalClientesExp();

                        this._setupMenu();
                    }.bind(this),
                    error: (e) => {
                        let newPortal = {
                            portal: {
                                proveedores: false,
                                clientesExportacion: false,
                                pagoClientes: false,
                                onlyPagoClientes: false
                            }
                        }
                        var oNewPortal = new JSONModel(newPortal);
                        this.getView().setModel(oNewPortal, 'portal');
                    }
                });

                var iPagesCount = 1;

                if (Device.system.desktop) {
                    iPagesCount = 4;
                } else if (Device.system.tablet) {
                    iPagesCount = 2;
                }

                var oSettingsModel = new JSONModel({ pagesCount: iPagesCount, appBaseUrl: appBaseUrl });
                this.getView().setModel(oSettingsModel, "settings");
            },
            // getLogonEmail: function () {
            //     var userEmail = "@blueboot.com",
            //         userDomain = '',
            //         userInfo
                    
            //     if (sap.ushell){
            //         userInfo = sap.ushell.Container.getService("UserInfo");
            //         if (userInfo) {
            //              userEmail = userInfo.getEmail();
            //              userDomain = userEmail.split('@')[1];
            //              console.log(userDomain)
            //         }
            //     }
            //     return userDomain;
            // },

            _accionesPortalProveedores: function () {
                var isProveedor = this.userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_LOGISTICA_PORTAL_PROVEEDORES_PROVEEDOR')
                    || this.userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_LOGISTICA_PORTAL_PROVEEDORES_FACTORING');
                var isInterno = this.userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_LOGISTICA_PORTAL_PROVEEDORES_INTERNOS');
                var isCuentasXPagar = this.userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_LOGISTICA_PORTAL_PROVEEDORES_CUENTAS_X_PAGAR');
                var isAdmin = this.userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_LOGISTICA_PORTAL_PROVEEDORES_ADMIN');

                this.getComunicados(isInterno);
                this._registrarAccesoProveedor(isProveedor);
                this._showToSProv(isProveedor);
            },

            _accionesPortalClientesExp: function () {
                var isCliente = this.userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_COMERCIAL_PORTAL_CLIENTES_CLIENTE');
                this._showToSCliExp(isCliente);
                this._loadSociedadesClientesExp();
            },

            _registrarAccesoProveedor: function (isProveedor) {
                var provApps = ["OrdenesCompras", "Facturas", "HistorialPagos", "MisDatos", "Consultas"];
                var semanticObject = window.location.hash.split("-")[0];

                var currentAppName = '';
                if (semanticObject?.substring(1)) {
                    currentAppName = semanticObject.substring(1);
                }

                var jti = this.userInfo?.jti;

                if (isProveedor && jti && provApps.indexOf(currentAppName) > -1) {
                    this.oDataModelProv.read("/AccesosPortalSet", { // this.oDataModelProv.create("/AccesosPortalSet", {
                        SessionId: jti,
                        Seccion: window.location.hash.split("-")[0]?.substring(1),
                        IdExterno: this.userInfo.email
                    });
                }
            },

            _showToSProv: function (isProveedor) {
                if (isProveedor) {
                    this.oDataModelProv.read('/ProveedoresSet', {
                        success: function (data) {
                            var proveedores = '';
                            data.results.map((proveedor) => {
                                proveedores += proveedor.Nombre + "<br/>"
                            })
                            var dialogContent = [
                                new Text({ text: this.i18n.getText('terminosDelServicio') }),
                                new FormattedText({ htmlText: proveedores })
                            ]


                            if (!("termsAccepted" in sessionStorage)) {
                                if (!this.oDefaultMessageDialog) {
                                    this.oDefaultMessageDialog = new Dialog({
                                        type: DialogType.Message,
                                        title: this.i18n.getText('terminos'),
                                        content: dialogContent,
                                        beginButton: new Button({
                                            type: ButtonType.Emphasized,
                                            text: this.i18n.getText('Aceptar'),
                                            press: function () {
                                                sessionStorage.setItem("termsAccepted", "TermsAccepted");
                                                this.oDefaultMessageDialog.close();
                                                this.defToSProv.resolve();
                                            }.bind(this)
                                        }),
                                        endButton: new Button({
                                            type: ButtonType.Emphasized,
                                            text: this.i18n.getText('LeerTerminos'),
                                            press: this.openToS.bind(this)
                                        }),
                                        escapeHandler: function (oEvent) { oEvent.preventDefault(); }
                                    });
                                }
                                this.oDefaultMessageDialog.open();
                            }

                        }.bind(this),
                        error: function (error) {
                            MessageToast.show(that.i18n.getText("error"))
                        }
                    });
                } else {
                    this.defToSProv.resolve();
                }
            },

            _showToSCliExp(isCliente) {
                if (isCliente && !("termsAcceptedCliente" in sessionStorage)) {
                    var dialogClientContent = [
                        new Text({ text: this.i18n.getText('terminosDelServicioCliente1') }),
                        new Text({ text: this.i18n.getText('terminosDelServicioCliente2') }),
                        new Text({ text: this.i18n.getText('terminosDelServicioCliente3') }),
                    ]
                    if (!this.oDefaultMessageDialogCliente) {
                        this.oDefaultMessageDialogCliente = new Dialog({
                            type: DialogType.Message,
                            title: this.i18n.getText('confidencialidad'),
                            content: dialogClientContent,
                            beginButton: new Button({
                                type: ButtonType.Emphasized,
                                text: this.i18n.getText('Aceptar'),
                                press: function () {
                                    sessionStorage.setItem("termsAcceptedCliente", "TermsAcceptedCliente")
                                    this.oDefaultMessageDialogCliente.close();
                                    this.defToSCliE.resolve();
                                }.bind(this)
                            }),
                            escapeHandler: function (oEvent) { oEvent.preventDefault(); }
                        });
                    }
                    this.oDefaultMessageDialogCliente.open();
                } else {
                    this.defToSCliE.resolve();
                }
            },

            _loadSociedadesClientesExp: function () {
                //Estas son las sociedades que vienen de odata
                var societiesLinked_ = {
                    "C001": {
                        "Desc_1": "Viña Concha y Toro S.A.",
                        "linked": false
                    },
                    "C003": {
                        "Desc_1": "Viña Cono Sur S.A.",
                        "linked": false
                    },
                    "C005": {
                        "Desc_1": "Soc.Ex.Com.Viña Maipo SPA",
                        "linked": false
                    },
                    "C006": {
                        "Desc_1": "Soc.Exp. Viña Canepa S.A.",
                        "linked": false
                    },
                    "C007": {
                        "Desc_1": "B y V Quinta de Maipo SPA",
                        "linked": false
                    },
                    "C008": {
                        "Desc_1": "Trivento Bod y Viñedos SA",
                        "linked": false
                    },
                    "C009": {
                        "Desc_1": "Finca Lunlunta S.A.",
                        "linked": false
                    },
                    "C014": {
                        "Desc_1": "Viña Maycas del Limarí Lt",
                        "linked": false
                    },
                    "C021": {
                        "Desc_1": "Viña Don Melchor SpA",
                        "linked": false
                    },
                    "C000": {//Este no viene en el servicio, es solo para pruebas
                        "Desc_1": "",
                        "linked": false
                    }
                };

                var aFilters = new Array();
                var FilterSociedad = new sap.ui.model.Filter({
                    path: "Code",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: 'Sociedad'
                });
                aFilters.push(FilterSociedad);

                var that = this;
                this.oDataModel.read("/ValueHelpSet", {
                    filters: aFilters,
                    success: (data) => {
                        //Asigno el valor a la variable linked, la cual es usada para mostrar/ocultar las imagenes
                        societiesLinked_.C001.linked = that.societyExistsInArray(data.results, "C001");
                        societiesLinked_.C003.linked = that.societyExistsInArray(data.results, "C003");
                        societiesLinked_.C005.linked = that.societyExistsInArray(data.results, "C005");
                        societiesLinked_.C006.linked = that.societyExistsInArray(data.results, "C006");
                        societiesLinked_.C007.linked = that.societyExistsInArray(data.results, "C007");
                        societiesLinked_.C008.linked = that.societyExistsInArray(data.results, "C008");
                        societiesLinked_.C009.linked = that.societyExistsInArray(data.results, "C009");
                        societiesLinked_.C014.linked = that.societyExistsInArray(data.results, "C014");
                        societiesLinked_.C021.linked = that.societyExistsInArray(data.results, "C021");

                        var societiesLinked = new JSONModel(societiesLinked_);
                        this.getView().setModel(societiesLinked, "societiesLinked");
                    },
                    error: (error) => console.log(JSON.stringify(error))
                })

                var societiesLinked = new JSONModel(societiesLinked_);

                this.getView().setModel(societiesLinked, "societiesLinked");
            },

            _setupMenu: function () {
                var menuProveedoresModel = new sap.ui.model.json.JSONModel(sap.ui.require.toUrl("com/cyt/zuxportalesbase2021111116/model/menuProveedores.json"));
                var menuClientesExpModel = new sap.ui.model.json.JSONModel(sap.ui.require.toUrl("com/cyt/zuxportalesbase2021111116/model/menuClientesExportacion.json"));
                var menuPagoClientesModel = new sap.ui.model.json.JSONModel(sap.ui.require.toUrl("com/cyt/zuxportalesbase2021111116/model/menuPagoClientes.json"));

                $.when(menuProveedoresModel.dataLoaded(), menuClientesExpModel.dataLoaded(), menuPagoClientesModel.dataLoaded()).done(function () {
                    var portales = this.getView().getModel('portal').getProperty('/portal');

                    var portalCount = 0;

                    for (let key in portales) {
                        if (portales[key]) {
                            portalCount++;
                        }
                    }

                    var menu = [];

                    if (portalCount > 1) {
                        if (portales.proveedores) {
                            menu.push({
                                title: "proveedores",
                                submenu: menuProveedoresModel.getData()
                            });
                        }

                        if (portales.clientesExportacion) {
                            menu.push({
                                title: "clientesExportacion",
                                submenu: menuClientesExpModel.getData()
                            });
                        }

                        if (portales.pagoClientes) {
                            menu.push({
                                title: "pagoClientes",
                                submenu: menuPagoClientesModel.getData()
                            });
                        }
                    } else {
                        if (portales.proveedores) {
                            menu = menuProveedoresModel.getData()
                        }

                        if (portales.clientesExportacion) {
                            menu = menuClientesExpModel.getData()
                        }

                        if (portales.pagoClientes) {
                            menu = menuPagoClientesModel.getData()
                        }
                    }

                    var toolHeader = this.byId("toolHeaderMenu");

                    toolHeader.removeAllContent();


                    //HOME BUTTON
                    var homeButton = new sap.m.Button({
                        icon: 'sap-icon://home',
                        type: sap.m.ButtonType.Transparent,
                        press: function() {
                            window.history.go(-1); // Navegar hacia atrás en la historia del navegador
                        }
                    });
                    
                    homeButton.setLayoutData(new sap.m.OverflowToolbarLayoutData({ priority: sap.m.OverflowToolbarPriority.NeverOverflow }));
                    toolHeader.addContent(homeButton);
                    // var homeButton = new sap.m.Button({
                    //     icon: 'sap-icon://home',
                    //     type: sap.m.ButtonType.Transparent
                    // });
                    // homeButton.attachPress({
                    //     "type": "External",
                    //     "link": "PortalesCyT",
                    //     "action": "Display"
                    // }, this.onLinkPress.bind(this));
                    // homeButton.setLayoutData(new sap.m.OverflowToolbarLayoutData({ priority: sap.m.OverflowToolbarPriority.NeverOverflow }));
                    // toolHeader.addContent(homeButton);

                    //Menú dinámico por portal
                    menu.forEach(function (option) {
                        var hasAccess = false;
                        if (option.rol) {
                            option.rol.forEach(function (rol) {
                                if (this.userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes(rol)) {
                                    hasAccess = true;
                                }
                            }.bind(this));
                        } else {
                            hasAccess = true;
                        }

                        if (hasAccess) {
                            if (option.submenu) {
                                var button = new sap.m.MenuButton({
                                    type: sap.m.ButtonType.Transparent
                                });

                                button.addStyleClass("hoverMenu");

                                if (option.title) {
                                    button.setText(this.i18n.getText(option.title));
                                }

                                var menu = new sap.m.Menu();
                                var items = this._buildMenuItems(option);
                                items.forEach(function (item) {
                                    menu.addItem(item);
                                });

                                button.setMenu(menu);

                                button.setLayoutData(new sap.m.OverflowToolbarLayoutData({ priority: sap.m.OverflowToolbarPriority.Low }));

                                toolHeader.addContent(button);
                            } else {
                                var button = new sap.m.Button({
                                    type: sap.m.ButtonType.Transparent
                                });

                                button.addStyleClass("hoverMenu");

                                if (option.title) {
                                    button.setText(this.i18n.getText(option.title));
                                }

                                button.attachPress(option.action, this.onLinkPress.bind(this));

                                button.setLayoutData(new sap.m.OverflowToolbarLayoutData({ priority: sap.m.OverflowToolbarPriority.Low }));
                                toolHeader.addContent(button);
                            }
                        }
                    }.bind(this));


                    //Comunicados BUTTON
                    if (portales.proveedores) {
                        toolHeader.addContent(new sap.m.ToolbarSpacer());

                        var notifButton = new sap.m.Button({
                            icon: 'sap-icon://bell',
                            type: sap.m.ButtonType.Transparent
                        });

                        this.notifButton = notifButton;

                        notifButton.attachPress({}, this.handleNotifListPress.bind(this));

                        var badge = new sap.m.BadgeCustomData({
                            key: 'badge',
                            visible: true
                        });

                        badge.bindProperty('value', 'ComunicadosBase>/CantComunicaciones');

                        notifButton.addCustomData(badge);
                        notifButton.setLayoutData(new sap.m.OverflowToolbarLayoutData({ priority: sap.m.OverflowToolbarPriority.NeverOverflow }));
                        toolHeader.addContent(notifButton);
                    }

                    this.defMenu.resolve();
                }.bind(this))
            },

            _buildMenuItems: function (options) {
                var items = [];
                options.submenu.forEach(function (option) {
                    var hasAccess = false;
                    if (option.rol) {
                        option.rol.forEach(function (rol) {
                            if (this.userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes(rol)) {
                                hasAccess = true;
                            }
                        }.bind(this));
                    } else {
                        hasAccess = true;
                    }

                    if (hasAccess) {
                        var item = new sap.m.MenuItem();

                        if (option.title) {
                            item.setText(this.i18n.getText(option.title));
                        }

                        if (option.icon) {
                            item.setIcon(option.icon);
                        }



                        if (option.submenu) {
                            var subitems = this._buildMenuItems(option);
                            subitems.forEach(function (subitem) {
                                item.addItem(subitem);
                            });
                        } else {
                            item.attachPress(option.action, this.onLinkPress.bind(this));
                        }

                        items.push(item);
                    }
                }.bind(this));

                return items;
            },

            getComunicados: function (interno) {
                $.when(this.defCom, this.defRen, this.defToSProv, this.defToSCliE, this.defMenu).done(function () {
                    var cantidad = this.getView().getModel('ComunicadosBase').getProperty('/CantComunicaciones')

                    if (cantidad > 0 && !("notifOpen" in sessionStorage)) {
                        sessionStorage.setItem("notifOpen", 1);
                        this.notifButton.firePress();
                    }
                }.bind(this))

                var date = new Date()
                var formattedDate = date.toLocaleDateString('en-GB')
                var today = `${formattedDate.substring(6, 10)}${formattedDate.substring(3, 5)}${formattedDate.substring(0, 2)}`

                var oFilters = []
                if (interno) {
                    var FilterDesde = new sap.ui.model.Filter({
                        path: "ValidoDesde",
                        operator: sap.ui.model.FilterOperator.LE,
                        value1: `${today}`
                    });
                    oFilters.push(FilterDesde)
                    var FilterHasta = new sap.ui.model.Filter({
                        path: "ValidoHasta",
                        operator: sap.ui.model.FilterOperator.GE,
                        value1: `${today}`
                    });
                    oFilters.push(FilterHasta)
                }

                var FilterActivo = new sap.ui.model.Filter({
                    path: "Activos",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: `X`
                });
                oFilters.push(FilterActivo)

                this.oDataModelProv.read('/ComunicacionesSet', {
                    filters: oFilters,
                    success: function (data) {
                        var comunicaciones = data.results
                        var leidas = localStorage.getItem("CommunicationsRead")


                        var dateFormatter = DateFormat.getDateInstance({ pattern: 'dd/MM/yyyy' });

                        var fecha;
                        leidas = JSON.parse(leidas)

                        comunicaciones.map((unaCom) => {

                            unaCom["leida"] = (leidas && leidas.indexOf(unaCom.NroComunicacion) > -1);
                            // unaCom["leida"] = (leidas && leidas.filter((a)=>{a.nroComunicacion === unaCom.NroComunicacion}).length > 0)

                            fecha = unaCom['ValidoDesde']
                            if (fecha) {
                                unaCom['ValidoDesde'] = dateFormatter.format(dateFormatter.parse(fecha));
                            } else {
                                unaCom['ValidoDesde'] = '-';
                            }

                            var div = document.createElement("div");
                            div.innerHTML = unaCom['Mensaje'];
                            var text = div.textContent || div.innerText || "";

                            unaCom["MensajePlano"] = text

                        })
                        comunicaciones = comunicaciones.sort((a, b) => a.leida > b.leida ? 1 : -1);

                        var cantidad = comunicaciones.filter((a) => !a.leida).length
                        this.getView().getModel('ComunicadosBase').setProperty('/CantComunicaciones', cantidad)
                        this.getView().getModel('ComunicadosBase').setProperty('/Comunicaciones', comunicaciones);

                        this.defCom.resolve();

                    }.bind(this),
                    error: function (error) {
                        console.log(error);
                    }.bind(this)
                })

            },

            onAfterRendering: function () {
                Base.prototype.onAfterRendering.call(this);
                this.defRen.resolve();
            },

            societyExistsInArray: function (societies, code) {
                var exist = false;
                var societyFiltered = societies.filter(function (society) {
                    return society.Code === code;
                });
                if (societyFiltered.length > 0) {
                    exist = true;
                }
                return exist;
            },

            setLanguage: function (language) {
                sap.ui.getCore().getConfiguration().setLanguage(language);
                localStorage.setItem("Language", language)

                this.oCrossAppNav = sap.ushell.Container.getService(
                    "CrossApplicationNavigation"
                );
                this.oCrossAppNav.toExternal({
                    target: {
                        semanticObject: "PortalesCyT",
                        action: "Display"
                    }
                });

                this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle();

                this._setupMenu();

                // window.location.reload(true);
            },

            switchLanguage: function () {
                var language = localStorage.getItem("Language");
                if (language === 'ES') {
                    localStorage.setItem("Language", "EN")
                    sap.ui.getCore().getConfiguration().setLanguage('EN');
                } else {
                    localStorage.setItem("Language", "ES")
                    sap.ui.getCore().getConfiguration().setLanguage('ES');
                }
            },

            openToS: function () {
                var oView = this.getView();

                if (!this.oToSDialog) {
                    this.oToSDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.cyt.zuxportalesbase2021111116.view.ToS",
                        controller: this
                    }).then(function (oToSDialog) {
                        oView.addDependent(oToSDialog);
                        return oToSDialog;
                    });
                }

                this.oToSDialog.then(function (oToSDialog) {
                    oToSDialog.open();
                }.bind(this));
            },

            closeToS: function () {
                // this.oToSDialog.close();
                this.oToSDialog.then(function (oToSDialog) {
                    oToSDialog.close();
                }.bind(this));
            },

            handleNotifListPress: function (oEvent) {
                // Set the element that will serve as 'within area' for all popups    
                var oButton = oEvent.getSource(),
                    oView = this.getView();

                // Create popover
                if (!this._pDialogNotif) {
                    this._pDialogNotif = Fragment.load({
                        id: oView.getId(),
                        name: "com.cyt.zuxportalesbase2021111116.view.NotificacionesDialog",
                        controller: this
                    }).then(function (oPopover) {
                        oView.addDependent(oPopover);
                        // oPopover.bindElement("/ProductCollection/0");
                        return oPopover;
                    });
                }
                this._pDialogNotif.then(function (oPopover) {
                    oPopover.openBy(oButton);
                });
            },

            notifPress: function (oEvent) {
                var comunicacion = oEvent.getParameter("listItem").getBindingContext('ComunicadosBase')
                var nroComunicacion = comunicacion.getProperty("NroComunicacion")
                var fechaModifica = comunicacion.getProperty("FechaModifica")
                var leidas = localStorage.getItem("CommunicationsRead");


                this.getView().getModel('ComunicadosBase').setProperty(comunicacion.getPath() + "/leida", true)


                this.onComunicacionPress(comunicacion)

                var comunicaciones = this.getView().getModel('ComunicadosBase').getProperty('/Comunicaciones');
                comunicaciones = comunicaciones.sort((a, b) => a.leida > b.leida ? 1 : -1);
                this.getView().getModel('ComunicadosBase').setProperty('/Comunicaciones', comunicaciones);

                var cantidad = comunicaciones.filter((a) => !a.leida).length
                this.getView().getModel('ComunicadosBase').setProperty('/CantComunicaciones', cantidad)

                if (leidas) {
                    leidas = JSON.parse(leidas)
                    if (leidas.indexOf(nroComunicacion) == -1) {
                        leidas.push(nroComunicacion);
                    }
                } else {
                    leidas = [nroComunicacion]
                }

                // if (leidas) {
                //     leidas = JSON.parse(leidas)
                //     if (leidas.filter((a)=>{a.nroComunicacion = nroComunicacion})) {
                //         leidas.push({ nroComunicacion: nroComunicacion, fechaModifica: fechaModifica })
                //     }
                // } else {
                //     leidas = [{ nroComunicacion: nroComunicacion, fechaModifica: fechaModifica }]
                // }

                localStorage.setItem("CommunicationsRead", JSON.stringify(leidas));
            },

            onComunicacionPress: function (comunicacion) {
                // if (!this.oInfoMessageDialog) {
                this.oInfoMessageDialog = new Dialog({
                    type: DialogType.Message,
                    title: comunicacion.getProperty("Titulo"),
                    state: ValueState.Information,
                    content: new FormattedText({ htmlText: comunicacion.getProperty("Mensaje") }),
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "OK",
                        press: function () {
                            this.oInfoMessageDialog.close();
                        }.bind(this)
                    }),
                    // afterClose: function(){ this.oInfoMessageDialog.destroy()}.bind(this),
                });
                // }

                this.oInfoMessageDialog.open();
            },

            descargarArchivo: function (filename) {

                var idioma = filename === "CodigoProveedores" ? "" : sap.ui.getCore().getConfiguration().getLanguage();
                var element = document.createElement('a');
                var url = this.getView().getModel('settings').getData().appBaseUrl + '/files/' + filename + idioma.toUpperCase() + '.pdf'
                //var url = this.getView().getModel('settings').getData().appBaseUrl + '/files/' + filename  //+ idioma + '.pdf' 

                element.setAttribute('href', url);
                var finalName = url.split("/")[url.split("/").length - 1];
                element.setAttribute('download', finalName);

                element.style.display = 'none';
                document.body.appendChild(element);

                element.click();

                document.body.removeChild(element);
            },

        });
    });

