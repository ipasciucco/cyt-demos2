sap.ui.define([
    //"sap/ui/core/mvc/Controller",
    "com/cyt/zuxportalesbase2021111116/controller/Base.controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/model/odata/v2/ODataModel",
    'sap/ui/export/library',
    'sap/ui/export/Spreadsheet',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/core/format/DateFormat',
    //'com/cyt/zuxportalesbase2021111116/model/formatter',
    'com/cyt/zmmportalproveedoresfacturas2021111116/model/formatterFacturas',
    'com/cyt/zmmportalproveedoresfacturas2021111116/utils/utils',
    'sap/m/Token',
    'sap/ui/model/type/String',
    'sap/m/ColumnListItem',
    'sap/m/Label',
    'sap/m/SearchField',
    'com/cyt/zmmportalproveedoresfacturas2021111116/utils/html2pdf'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Base, MessageToast, JSONModel, Fragment, ODataModel, exportLibrary, Spreadsheet, Filter, FilterOperator, DateFormat, formatterFacturas, Token, TypeString, ColumnListItem, Label, SearchField   ) {
        "use strict";

        return Base.extend("com.cyt.zmmportalproveedoresfacturas2021111116.controller.Master", {
            formatter: formatterFacturas,

            onInit: function () {
                // var withoutRoles
                // var userDomain = this.getLogonEmail();
                // if(userDomain == 'gmail.com') withoutRoles = true
                
                var appBaseUrl = jQuery.sap.getModulePath("com.cyt.zuxportalesbase2021111116");
                var serviceDest = 'ECC_CYT_HTTP_PTALPROV';

                this.oDataModel = new ODataModel(appBaseUrl + '/proxy/' + serviceDest + '/sap/opu/odata/sap/ZCL_MM_PORTAL_PRO_SRV', { useBatch:false});

                // Inicializa modelos
                var oModel = new JSONModel();
                this.getView().setModel(oModel);
                this.oModel = oModel;


                // Trae listado de sociedades para el filtro por sociedad
                var that = this;
                this.oDataModel.read('/ValueHelpSet', {
                    filters: [new Filter({path: "Code", operator: FilterOperator.EQ, value1: 'Sociedad' })],
                    success: (data) => {that.oModel.setProperty('/SociedadesCollection',data.results)},
                    error: (e) => {MessageToast.show("{i18n>error}")}
                })
                // Trae listado de Clase de Documentos
                this.oDataModel.read('/ValueHelpSet', {
                    filters: [new Filter({path: "Code", operator: FilterOperator.EQ, value1: 'ClaseDoc' })],
                    success: (data) => {that.oModel.setProperty('/ClasesDocCollection',data.results)},
                    error: (e) => {MessageToast.show("{i18n>error}")}
                })
                //this.getProveedores();


                // Modelo de facturas no contabilizadas
                var tableModelNC = new JSONModel({'Facturas': []});
                this.getView().setModel(tableModelNC, "factNoCont")
                this.getView().getModel("factNoCont").setSizeLimit(999999)

                // Modelo de facturas contabilizadas
                var tableModelC = new JSONModel({'Facturas': []});
                this.getView().setModel(tableModelC, "factCont");
                this.getView().getModel("factCont").setSizeLimit(999999);

                this._clearModelFacturasNoCont();
                this._clearModelFacturasCont();

                // Primera llamada al servicio
                //this.onSearchFacturasNoCont({skip:0,top:10});
                this.searchFacturasNoCont();
                this.searchFacturasContabilizadas();

                var isFactoring = false;
                var isProveedor = false;
                var isInterno = false;

                $.ajax({
                    url: appBaseUrl + "/userinfo",
                    type: 'GET',
                    success: (data)=>{
                        let userInfo = JSON.parse(data)

                        isFactoring = userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_LOGISTICA_PORTAL_PROVEEDORES_FACTORING');
                        isProveedor = userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_LOGISTICA_PORTAL_PROVEEDORES_PROVEEDOR');
                        isInterno = userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_LOGISTICA_PORTAL_PROVEEDORES_INTERNOS');
                        if (isInterno) {
                            this.getView().getModel().setProperty("/isFactoring",isInterno)
                            this.getView().getModel().setProperty("/isProveedor",isInterno)
                        } else {
                            this.getView().getModel().setProperty("/isFactoring",isFactoring)
                            this.getView().getModel().setProperty("/isProveedor",isProveedor)
                        }

                    },
                    error: (e)=>{console.log(e)}
                }); 

                this.oColModel = new JSONModel({ "cols": [{
                    "label": "ID SAP",
                    "template": "Code",
                },{
                    "label": "Proveedor",
                    "template": "Desc_1",
                },{
                    "label": "RUT",
                    "template": "Desc_2",  
                }]})
            },
            getLogonEmail: function () {
                var userEmail = '',
                    userDomain = '',
                    userInfo
                    
                if (sap.ushell){
                    userInfo = sap.ushell.Container.getService("UserInfo");
                    if (userInfo) {
                         userEmail = userInfo.getEmail();
                         userDomain = userEmail.split('@')[1];
                         console.log(userDomain)
                    }
                }
                return userDomain;
            },

            getProveedores: function(){
                var that = this;
                // Trae listado de Proveedores
                this.oDataModel.read('/ValueHelpSet', {
                    filters: [new Filter({path: "Code", operator: FilterOperator.EQ, value1: 'Proveedor' })],
                    success: (data) => {that.oModel.setProperty('/ProveedorCollection',data.results)},
                    error: (e) => {MessageToast.show("{i18n>error}")}
                })
            },

            searchFacturasNoCont: function(){
                this.onSearchFacturasProveedores({skip:0,top:10});
                this.onSearchFacturasFactoring({skip:0,top:10});
            },

            searchFacturasContabilizadas: function(){
                this.onSearchFacturasContC({skip:0,top:10});
                this.onSearchFacturasContP({skip:0,top:10});
            },

            changeTokensNoCont: function (oEvent) {
                setTimeout(()=>{this.searchFacturasNoCont()}, 500)
            },

            changeTokensCont: function (oEvent) {
                setTimeout(()=>{this.searchFacturasContabilizadas()}, 500)
            },

            _clearModelFacturasNoCont: function(){
                // Inicialización de los filtros, las fechas son de un periodo de 3 meses
                var dateStart = new Date();
                var dateEnd = new Date();
                var minimumDate = new Date();
                dateStart.setMonth(dateEnd.getMonth() - 3);     
                minimumDate.setMonth(dateEnd.getMonth() - 6);   

                this.oModel.setProperty('/filtrosFacturasNoCont',{
                    Sociedad: '',
                    Factura: '',
                    Estado: '',
                    ClaseDocumento: '',
                    Proveedor: [],
                    EmisionDesde: dateStart.toLocaleDateString('en-GB'),
                    EmisionHasta: dateEnd.toLocaleDateString('en-GB'),
                    minimumDate: minimumDate,
                });
                this.getView().getModel("factNoCont").setProperty("/FacturasProv",[])
                this.getView().getModel("factNoCont").setProperty("/FacturasFact",[])

            },

            _clearModelFacturasCont: function(){
                // Inicialización de los filtros, las fechas son de un periodo de 3 meses
                var dateStart = new Date();
                var dateEnd = new Date();
                var minimumDate = new Date();
                dateStart.setMonth(dateEnd.getMonth() - 3);     
                minimumDate.setMonth(dateEnd.getMonth() - 6);      

                this.oModel.setProperty('/filtrosFacturasCont',{
                    Sociedad: '',
                    ClaseDocumento: '',
                    Estado: '',
                    Proveedor: [],
                    FechaDocDesde: dateStart.toLocaleDateString('en-GB'),
                    FechaDocHasta: dateEnd.toLocaleDateString('en-GB'),
                    Bloqueada: false,
                    PagoDesde: '',
                    PagoHasta: '',
                    Referencia: '',
                    minimumDate: minimumDate
                }); 
                this.getView().getModel("factCont").setProperty("/FacturasP",[])
                this.getView().getModel("factCont").setProperty("/FacturasC",[])

            },
            loadFactProv: function(oEvent) {
                // Se realiza la llamada con el skip igual a la cantidad de registros actuales para traer los siguientes 
                var facturas = this.getView().getModel("factNoCont").getProperty('/FacturasProv')
                this.onSearchFacturasProveedores({top:10,skip: facturas.length});
            },
            loadFactFact: function(oEvent) {
                // Se realiza la llamada con el skip igual a la cantidad de registros actuales para traer los siguientes 
                var facturas = this.getView().getModel("factNoCont").getProperty('/FacturasFact')
                this.onSearchFacturasFactoring({top:10,skip: facturas.length});
            },
            loadFactContC: function(oEvent) {
                // Se realiza la llamada con el skip igual a la cantidad de registros actuales para traer los siguientes 
                var tableModel = this.getView().getModel("factCont");
                var facturasC = tableModel.getProperty('/FacturasC');
                this.onSearchFacturasContC({top:10, skip:facturasC.length});
            },
            loadFactContP: function(oEvent) {
                // Se realiza la llamada con el skip igual a la cantidad de registros actuales para traer los siguientes 
                var tableModel = this.getView().getModel("factCont");
                var facturasP = tableModel.getProperty('/FacturasP');
                this.onSearchFacturasContP({top:10, skip:facturasP.length});
            },

            getFiltrosFacturasNoCont: function() {
                var oFilter = this.oModel.getProperty('/filtrosFacturasNoCont');
                var aFilters = [];

                var date,fecha,fechaString,fechaDesde,fechaDesdeString,fechaHasta,fechaHastaString;

                if (oFilter.Sociedad){                    
                    var FilterSociedad = new Filter({ path: "Sociedad", operator: FilterOperator.EQ, value1: oFilter.Sociedad });
                    aFilters.push(FilterSociedad)
                }

                if (oFilter.ClaseDocumento){
                    aFilters.push(
                        new Filter({ path: "ClaseDoc", operator: FilterOperator.Contains, value1: oFilter.ClaseDocumento })
                    );
                }

                if (oFilter.Factura){                     
                    var FilterFactura = new Filter({path: "Factura", operator: FilterOperator.Contains, value1: oFilter.Factura });
                    aFilters.push(FilterFactura)
                }
                if (oFilter.Estado && oFilter.Estado !== 'T'){                    
                    var FilterEstado = new Filter({ path: "Estado", operator: FilterOperator.EQ, value1: oFilter.Estado });
                    aFilters.push(FilterEstado)
                }

                // Filtros proveedores
                var filterProvAux = [];
                var tokens = this.byId("multiInputProvNC").getTokens();
                if(tokens.length > 0) {
                    tokens.map((unProv)=>{
                        filterProvAux.push( new Filter({path: 'Proveedor', operator: FilterOperator.EQ, value1: unProv.getKey()}) )
                    })
                    var filterProvs = new Filter({
                        filters: filterProvAux,
                        and: false
                    })
                    aFilters.push(filterProvs);
                }

                if (oFilter.EmisionDesde && oFilter.EmisionHasta) {
                    fechaDesde = oFilter.EmisionDesde.split("/");
                    fechaDesdeString = `${fechaDesde[2]}${fechaDesde[1]}${fechaDesde[0]}`
                    fechaHasta = oFilter.EmisionHasta.split("/");
                    fechaHastaString = `${fechaHasta[2]}${fechaHasta[1]}${fechaHasta[0]}`

                    var FilterEmisionHasta = new Filter({ path: "FechaEmision", operator: FilterOperator.BT, value1: fechaDesdeString, value2: fechaHastaString });
                    aFilters.push(FilterEmisionHasta)

                } else if (oFilter.EmisionDesde){
                    date = new Date(oFilter.EmisionDesde)
                    fecha = oFilter.EmisionDesde.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterEmisionDesde = new Filter({ path: "FechaEmision", operator: FilterOperator.GE, value1: fechaString });
                    aFilters.push(FilterEmisionDesde)

                } else if (oFilter.EmisionHasta) {
                    date = new Date(oFilter.EmisionHasta)
                    fecha = oFilter.EmisionHasta.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterEmisionHasta = new Filter({ path: "FechaEmision", operator: FilterOperator.LE, value1: fechaString });
                    aFilters.push(FilterEmisionHasta)
                }

                this.oModel.setProperty('/arrayFiltrosFactNoCont', aFilters)

                return aFilters;
            },

            onSearchFacturasProveedores: function({top=10,skip=0}) {

                // var withoutRoles
                // var userDomain = this.getLogonEmail();
                // if(userDomain !== 'blueboot.com') withoutRoles = true

                this.getView().setBusy(true);

                var aFilters = this.getFiltrosFacturasNoCont();

                var FilterStatusP = new Filter({ path: "TipoUsuario", operator: FilterOperator.EQ, value1: 'P' });

                var pFilters = [...aFilters, FilterStatusP];


                var that = this;
                var tableModel = this.getView().getModel("factNoCont");

                this.oDataModel.read("/FacturasNCSet", {
                    urlParameters: {"$top":top, "$skip":skip},
                    filters : pFilters,
                    success: (data) => {
                        var res, fecha;

                        // Si estoy llamando los primeros registros es porque cambié los filtros por lo que inicializo el modelo
                        if(skip == 0) {
                            tableModel.setProperty('/FacturasProv',[]);

                            // Y habilito el botón para "Cargar más"
                            var btn = that.getView().byId("loadMoreProveedores")
                            btn.setVisible(true)
                        }
                        // if (withoutRoles == true) {
                        //     res = data.results.slice();
                        //     res.forEach((element, index) => {
                        //         if (index >= 4) {
                        //             element.SociedadDesc = "cbrands";
                        //         }
                        //     });
                        //     res.splice(-2);

                        // } else{
                        // // Obtengo los resultados del odata
                        // if(!res || res == [] ) 
                        res = data.results;
                    // }
                        var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});
                        // Si tengo registros
                        if(res.length > 0) {
                            // Formateo las fechas
                            res.forEach((unRes) =>{
                                fecha = unRes['FechaEmision'];
                                if(fecha){ 
                                    unRes['FechaEmision'] = dateFormatter.format(dateFormatter.parse(fecha));
                                }else{
                                    unRes['FechaEmision'] = '-';
                                }

                                fecha = unRes['FechaRecepcion'];
                                if(fecha){
                                    unRes['FechaRecepcion'] = dateFormatter.format(dateFormatter.parse(fecha));
                                }else{
                                    unRes['FechaRecepcion'] = '-';
                                }
                            })

                            // Obtengo los registros del modelo y le agrego los nuevos
                            var facturas = tableModel.getProperty('/FacturasProv');
                            facturas = facturas.concat(res);

                            // Seteo el modelo
                            tableModel.setProperty('/FacturasProv',facturas);

                            // Si los registros que obtuvo son menos que los solicitados y no es la primera llamada muestro un mensaje indicando que no hay más registros y oculto el botón "Cargar más"
                            if(res.length < top && skip > 0){
                                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                                var btn = that.getView().byId("loadMoreProveedores")
                                btn.setVisible(false)
                            }
                            // Si los regustros que obtuvo son menos que los solicitados, sin importar si es la primera llamada o no, oculto el botón "Cargar más"
                            if(res.length < top){
                                var btn = that.getView().byId("loadMoreProveedores")
                                btn.setVisible(false)
                            }

                        } else {
                            // Si no trajo registros muestro mensaje y oculto botón de "Cargar más"
                            var btn = that.getView().byId("loadMoreProveedores")
                            btn.setVisible(false)
                            MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                        }

                        that.getView().setBusy(false);
                    },
                    error: (error) => {
                        MessageToast.show(error)
                        that.getView().setBusy(false);
                    }
                })
            },

            // onOpenOrdenCompraServiceHist: function (oEvent) {
            //     this.onOpenOrdenCompraService(oEvent, 'H');
            // },

            onOpenOrdenCompraService: function (oEvent, status) {
                var modelName = "factCont"//(status === 'P'?"ocServicios":"ocServiciosHist");
                var details = oEvent.getSource().getParent().getBindingContext(modelName).getObject();//oEvent.getSource().getParent().getBindingContext(modelName).getObject();

                var that = this;
                //this.oDataModel.read(`/OrdenesSet('${details.Orden}') `, {
                    this.oDataModel.read(`/OrdenesSet('4200719868') `, {
                    success: (data) => {
                        var ordencompra = new JSONModel({ 'ordencompra': details, 'ordendata': data });
                        var oView = this.getView();
                        oView.setModel(ordencompra, "ordencompra");

                        if (!this._pDialogPDFService) {
                            this._pDialogPDFService = Fragment.load({
                                id: oView.getId() + "PDFServices",
                                name: "com.cyt.zmmportalproveedoresfacturas2021111116.view.ordenesServicePDF",
                                controller: this
                            }).then(function (oDialogPDFService) {
                                oView.addDependent(oDialogPDFService);
                                return oDialogPDFService;
                            });
                        }

                        this._pDialogPDFService.then(function (oDialogPDFService) {
                            oDialogPDFService.open();
                        }.bind(this));

                    },
                    error: (e) => { MessageToast.show(that.getView().getModel("i18n").getResourceBundle("tryLater")) }
                })
            },
            exitMateriales: function (oEvent) {
                const oController = this;
                const source = oEvent.getSource();
                const ocId = source.data('oc');

                if (oController._pDialogPDF.has(ocId)) {
                    oController._pDialogPDF.get(ocId).then(function (oDialogPDF) {
                        oDialogPDF.close();
                    }.bind(oController));
                } else {
                    console.log(`exitMateriales: Dialog ${ocId} not found`);
                }

            },

            exitServices: function () {
                this._pDialogPDFService.then(function (oDialogPDFService) {
                    oDialogPDFService.close();
                }.bind(this));
            },

            'onPrint': function (oEvent) {

                const oController = this;

                const source = oEvent.getSource();
                // get the source's `oc` custom data attribute
                const ocId = source.data('oc');

                const oView = oController.getView()
                const id = oView.getId() + "PDF"

                // This points to the OC root Vbox
                const ocElement = Fragment.byId(id, ocId)

                ocElement.setBusy(true)

                const oModel = oView.getModel('ordencompra');

                const oOptions = {
                    margin: [0.4, 0.6, 0.4, 0.6],
                    filename: 'Orden de compra '+oModel.getProperty('/ordendata/Orden')+'.pdf',
                    image: { type: 'jpg', quality: 0.98 },
                    html2canvas: {
                        dpi: 300,
                        letterRendering: true,
                        useCORS: true,
                        scale: 2
                    },
                    jsPDF: { unit: 'in', format: 'A4' },
                    defaultFont: "Meta Serif OT",
                };

                const element = ocElement.getDomRef()

                const elementImg = Fragment.byId(id, `${ocId}-img`).getDomRef()

                console.log(`onPrint: ${ocId}`);

                try {
                    html2pdf().set(oOptions).from(element).toPdf().get('pdf').then(function (pdf) {
                        pdf.addPage();
                        ocElement.setBusy(false);
                    }).from(elementImg).toContainer().toCanvas().toPdf().save();
                    // html2pdf().set(oOptions).from(elementImg).toContainer().toCanvas().toPdf().save();
                } catch(e) {
                    MessageToast.show("Error. " + oController.getView().getModel("i18n").getResourceBundle("errorExcel")) 
                    ocElement.setBusy(false)
                }
                
            },

            onPrintServicios: function () {
                var oView = this.getView()
                var id = oView.getId() + "PDFServices"
                Fragment.byId(id, "oc").setBusy(true)


                var oModel = this.getView().getModel('ordencompra');

                const oOptions = {
                    margin: [0.4, 0.6, 0.4, 0.6],
                    //filename: 'Orden de compra '+oModel.getProperty('/ordencompra/Orden')+'.pdf',
                    filename: 'Invoice 1177.pdf',
                    image: { type: 'jpg', quality: 0.98 },
                    html2canvas: {
                        dpi: 300,
                        letterRendering: true,
                        useCORS: true,
                        scale: 2
                    },
                    jsPDF: { unit: 'in', format: 'A4' },
                    defaultFont: "Meta Serif OT",
                };

                var element = Fragment.byId(id, "oc").getDomRef()
                var elementImg = Fragment.byId(id, "ocImg").getDomRef()

                try {
                    html2pdf().set(oOptions).from(element).toPdf().get('pdf').then(function (pdf) {
                        pdf.addPage();
                        Fragment.byId(id, "oc").setBusy(false);
                    }).from(elementImg).toContainer().toCanvas().toPdf().save();
                } catch(e) {
                    MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel")) 
                    Fragment.byId(id, "oc").setBusy(false)
                }
            },

            onSearchFacturasFactoring: function({top=10,skip=0}) {
                this.getView().setBusy(true);

                var aFilters = this.getFiltrosFacturasNoCont();

                var FilterStatusF = new Filter({ path: "TipoUsuario", operator: FilterOperator.EQ, value1: 'F' });

                var fFilters = [...aFilters, FilterStatusF];


                var that = this;
                var tableModel = this.getView().getModel("factNoCont");

                this.oDataModel.read("/FacturasNCSet", {
                    urlParameters: {"$top":top, "$skip":skip},
                    filters : fFilters,
                    success: (data) => {
                        var res, fecha;

                        // Si estoy llamando los primeros registros es porque cambié los filtros por lo que inicializo el modelo
                        if(skip == 0) {
                            tableModel.setProperty('/FacturasFact',[]);

                            // Y habilito el botón para "Cargar más"
                            var btn = that.getView().byId("loadMoreFactoring")
                            btn.setVisible(true)
                        }

                        // Obtengo los resultados del odata
                        res = data.results;

                        var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});
                        // Si tengo registros
                        if(res.length > 0) {
                            // Formateo las fechas
                            res.forEach((unRes) =>{
                                fecha = unRes['FechaEmision'];
                                if(fecha){ 
                                    unRes['FechaEmision'] = dateFormatter.format(dateFormatter.parse(fecha));
                                }else{
                                    unRes['FechaEmision'] = '-';
                                }

                                fecha = unRes['FechaRecepcion'];
                                if(fecha){
                                    unRes['FechaRecepcion'] = dateFormatter.format(dateFormatter.parse(fecha));
                                }else{
                                    unRes['FechaRecepcion'] = '-';
                                }
                            })

                            // Obtengo los registros del modelo y le agrego los nuevos
                            var facturas = tableModel.getProperty('/FacturasFact');
                            facturas = facturas.concat(res);

                            // Seteo el modelo
                            tableModel.setProperty('/FacturasFact',facturas);

                            // Si los registros que obtuvo son menos que los solicitados y no es la primera llamada muestro un mensaje indicando que no hay más registros y oculto el botón "Cargar más"
                            if(res.length < top && skip > 0){
                                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                                var btn = that.getView().byId("loadMoreFactoring")
                                btn.setVisible(false)
                            }
                            // Si los regustros que obtuvo son menos que los solicitados, sin importar si es la primera llamada o no, oculto el botón "Cargar más"
                            if(res.length < top){
                                var btn = that.getView().byId("loadMoreFactoring")
                                btn.setVisible(false)
                            }

                        } else {
                            // Si no trajo registros muestro mensaje y oculto botón de "Cargar más"
                            var btn = that.getView().byId("loadMoreFactoring")
                            btn.setVisible(false)
                            MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                        }

                        that.getView().setBusy(false);
                    },
                    error: (error) => {
                        MessageToast.show(error)
                        that.getView().setBusy(false);
                    }
                })
            },

            getFiltrosFacturasCont: function() {
                var oFilter = this.oModel.getProperty('/filtrosFacturasCont');
                var aFilters = [];

                var date,fecha,fechaString,fechaDesde,fechaDesdeString,fechaHasta,fechaHastaString;

                // Arma los filtros que tengan valor
                if (oFilter.Sociedad){                    
                    var FilterSociedad = new Filter({ path: "Sociedad", operator: FilterOperator.EQ, value1: oFilter.Sociedad });
                    aFilters.push(FilterSociedad)
                }
                if (oFilter.ClaseDocumento){                     
                    var FilterFactura = new Filter({ path: "ClaseDoc", operator: FilterOperator.Contains, value1: oFilter.ClaseDocumento });
                    aFilters.push(FilterFactura)
                }
                if (oFilter.Estado){                    
                    var FilterEstado = new Filter({ path: "Estado", operator: FilterOperator.Contains, value1: oFilter.Estado });
                    aFilters.push(FilterEstado)
                }

                // Filtros proveedores
                var filterProvAux = [];
                var tokens = this.byId("multiInputProvC").getTokens();
                if(tokens.length > 0) {
                    tokens.map((unProv)=>{
                        filterProvAux.push( new Filter({path: 'Proveedor', operator: FilterOperator.EQ, value1: unProv.getKey()}) )
                    })
                    var filterProvs = new Filter({
                        filters: filterProvAux,
                        and: false
                    })
                    aFilters.push(filterProvs);
                }

                if (oFilter.FechaDesde && oFilter.FechaHasta) {
                    fechaDesde = oFilter.FechaDesde.split("/");
                    fechaDesdeString = `${fechaDesde[2]}${fechaDesde[1]}${fechaDesde[0]}`
                    fechaHasta = oFilter.FechaHasta.split("/");
                    fechaHastaString = `${fechaHasta[2]}${fechaHasta[1]}${fechaHasta[0]}`

                    var FilterEmisionHasta = new Filter({ path: "FechaDoc", operator: FilterOperator.BT, value1: fechaDesdeString, value2: fechaHastaString });
                    aFilters.push(FilterEmisionHasta)

                } else if (oFilter.FechaDesde){
                    date = new Date(oFilter.FechaDesde)
                    fecha = oFilter.FechaDesde.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterEmisionDesde = new Filter({ path: "FechaDoc", operator: FilterOperator.GE, value1: fechaString });
                    aFilters.push(FilterEmisionDesde)

                } else if (oFilter.FechaHasta) {
                    date = new Date(oFilter.FechaHasta)
                    fecha = oFilter.FechaHasta.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterEmisionHasta = new Filter({ path: "FechaDoc", operator: FilterOperator.LE, value1: fechaString });
                    aFilters.push(FilterEmisionHasta)
                }
                if (oFilter.Bloqueada && oFilter.Bloqueada !== 'A'){    
                    if(oFilter.Bloqueada==='S') {
                        var FilterBloqueada = new Filter({path: "IndicadorBloqueo", operator: FilterOperator.EQ, value1: "X" });
                    } else {
                        var FilterBloqueada = new Filter({path: "IndicadorBloqueo", operator: FilterOperator.EQ, value1: "" });
                    }
                    aFilters.push(FilterBloqueada)  
                }
                if (oFilter.PagoDesde && oFilter.PagoHasta) {
                    fechaDesde = oFilter.PagoDesde.split("/");
                    fechaDesdeString = `${fechaDesde[2]}${fechaDesde[1]}${fechaDesde[0]}`
                    fechaHasta = oFilter.PagoHasta.split("/");
                    fechaHastaString = `${fechaHasta[2]}${fechaHasta[1]}${fechaHasta[0]}`

                    var FilterEmisionHasta = new Filter({ path: "FechaPago", operator: FilterOperator.BT, value1: fechaDesdeString, value2: fechaHastaString });
                    aFilters.push(FilterEmisionHasta)

                } else if (oFilter.PagoDesde){
                    date = new Date(oFilter.PagoDesde)
                    fecha = oFilter.PagoDesde.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterPagoDesde = new Filter({ path: "FechaPago", operator: FilterOperator.GE, value1: fechaString });
                    aFilters.push(FilterPagoDesde)

                } else if (oFilter.PagoHasta) {
                    date = new Date(oFilter.PagoHasta)
                    fecha = oFilter.PagoHasta.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterPagoHasta = new Filter({ path: "FechaPago", operator: FilterOperator.LE, value1: fechaString });
                    aFilters.push(FilterPagoHasta)
                }
                if (oFilter.Referencia){                    
                    var FilterReferencia = new Filter({ path: "Referencia", operator: FilterOperator.Contains, value1: oFilter.Referencia });
                    aFilters.push(FilterReferencia)
                }

                this.oModel.setProperty('/arrayFiltrosFactCont', aFilters)

                return aFilters;
            },

            onSearchFacturasContC: function({top=10,skip=0}) {
                
                var withoutRoles
                var userDomain = this.getLogonEmail();
                if(userDomain !== 'blueboot.com') withoutRoles = true

                this.getView().setBusy(true);

                var aFilters = this.getFiltrosFacturasCont();

                var FilterStatusC = new Filter({ path: "Status", operator: FilterOperator.EQ, value1: 'C' });

                var cFilters = [...aFilters, FilterStatusC];


                var that = this;
                var tableModel = this.getView().getModel("factCont");

                this.oDataModel.read("/FacturasCSet", {
                    urlParameters: {"$top":top, "$skip":skip},
                    filters : cFilters,
                    success: (data) => {
                        var res, fecha;
                        // Si estoy llamando los primeros registros es porque cambié los filtros por lo que inicializo el modelo
                        if(skip == 0) {
                            // Vacío las facturaas compensadas
                            tableModel.setProperty('/FacturasC',[]);
                            // Y habilito el botón para "Cargar más"
                            var btn = that.getView().byId("loadMoreFactContC")
                            btn.setVisible(true)
                        }
                        if (withoutRoles == true) {
                            res = data.results.slice();
                            res.forEach((element, index) => {
                            // Generar una fecha aleatoria para 2023
                            let randomYear2023 = Math.floor(Math.random() * (2024 - 2023 + 1)) + 2023; // Entre 2023 y 2024
                            let randomMonth2023 = Math.floor(Math.random() * 12) + 1; // Mes entre 1 y 12
                            let randomDay2023 = Math.floor(Math.random() * 28) + 1; // Día entre 1 y 28

                            let formattedRandomDate2023 = `${randomYear2023}${randomMonth2023.toString().padStart(2, '0')}${randomDay2023.toString().padStart(2, '0')}`;

                            // Generar una fecha aleatoria para 2024
                            let randomYear2024 = 2024;
                            let randomMonth2024 = Math.floor(Math.random() * 12) + 1; // Mes entre 1 y 12
                            let randomDay2024 = Math.floor(Math.random() * 28) + 1; // Día entre 1 y 28

                            let formattedRandomDate2024 = `${randomYear2024}${randomMonth2024.toString().padStart(2, '0')}${randomDay2024.toString().padStart(2, '0')}`;
                                                
                            element.FechaDoc = formattedRandomDate2023
                            element.FechaPago = formattedRandomDate2024

                            let randomNumber = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                            // Formatear el número aleatorio para que tenga la estructura "xxxx,xx"
                            element.Monto = randomNumber + "," + Math.floor(Math.random() * 100);
                            element.NombreProv = "SAP";
                                // if (index >= 4) {
                                // element.SociedadDesc = "BlueBoot Business Software S.R.L.";
                           
                                // }
                            });
                            res.splice(-2);

                        } else{
                        // Obtengo los resultados del odata
                        // if(!res || res == [] ) 
                        res = data.results;
                        }
                        //  }
                        // res = data.results;

                        var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                        // Si tengo registros
                        if(res.length > 0) {

                            // Formateo las fechas
                            res.forEach((unRes) =>{
                                fecha = unRes['FechaDoc'];
                                if(fecha){ 
                                    unRes['FechaDoc'] = `${fecha.substr(6,2)}/${fecha.substr(4,2)}/${fecha.substr(0,4)}`//dateFormatter.format(dateFormatter.parse(fecha));
                                }else{
                                    unRes['FechaDoc'] = '-';
                                }

                                fecha = unRes['FechaPago'];
                                if(fecha){
                                    unRes['FechaPago'] = dateFormatter.format(dateFormatter.parse(fecha));
                                }else{
                                    unRes['FechaPago'] = '-';
                                }

                            })
                            // Seteo el modelo
                            var facturas = tableModel.getProperty('/FacturasC')
                            facturas = facturas.concat(res)
                            tableModel.setProperty('/FacturasC',facturas);      

                            if(res.length < top && skip > 0){
                                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                                var btn = that.getView().byId("loadMoreFactContC")
                                btn.setVisible(false)
                            }
                            // Si los regustros que obtuvo son menos que los solicitados, sin importar si es la primera llamada o no, oculto el botón "Cargar más"
                            if(res.length < top){
                                var btn = that.getView().byId("loadMoreFactContC")
                                btn.setVisible(false)
                            }

                        } else {
                            // Si no trajo registros muestro mensaje y oculto botón de "Cargar más"
                            var btn = that.getView().byId("loadMoreFactContC")
                            btn.setVisible(false)
                            MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                        }              

                        that.getView().setBusy(false);          
                    },
                    error: (error) => {
                        tableModel.setProperty('/Error', error)                      
                        that.getView().setBusy(false);    
                    }
                })               
            },

            onSearchFacturasContP: function({top=10,skip=0}) {

                this.getView().setBusy(true);
                var aFilters = this.getFiltrosFacturasCont();

                var FilterStatusP = new Filter({ path: "Status", operator: FilterOperator.EQ, value1: 'P' });

                var pFilters = [...aFilters, FilterStatusP];

                var that = this;
                var tableModel = this.getView().getModel("factCont");

                this.oDataModel.read("/FacturasCSet", {
                    urlParameters: {"$top":top, "$skip":skip},
                    filters : pFilters,
                    success: (data) => {
                        var res, fecha;
                        // Si estoy llamando los primeros registros es porque cambié los filtros por lo que inicializo el modelo
                        if(skip == 0) {
                            // Vacío las facturaas compensadas
                            tableModel.setProperty('/FacturasP',[]);
                            // Y habilito el botón para "Cargar más"
                            var btn = that.getView().byId("loadMoreFactContP")
                            btn.setVisible(true)
                        }
                        // Obtengo los resultados del odata
                        res = data.results;

                        var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                        // Si tengo registros
                        if(res.length > 0) {

                            // Formateo las fechas
                            res.forEach((unRes) =>{
                                fecha = unRes['FechaDoc'];
                                if(fecha){ 
                                    unRes['FechaDoc'] = `${fecha.substr(6,2)}/${fecha.substr(4,2)}/${fecha.substr(0,4)}`//dateFormatter.format(dateFormatter.parse(fecha));
                                }else{
                                    unRes['FechaDoc'] = '-';
                                }

                                fecha = unRes['FechaPago'];
                                if(fecha){
                                    unRes['FechaPago'] = dateFormatter.format(dateFormatter.parse(fecha));
                                }else{
                                    unRes['FechaPago'] = '-';
                                }

                            })
                            // Seteo el modelo
                            var facturas = tableModel.getProperty('/FacturasP')
                            facturas = facturas.concat(res)
                            tableModel.setProperty('/FacturasP',facturas);      

                            if(res.length < top && skip > 0){
                                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                                var btn = that.getView().byId("loadMoreFactContP")
                                btn.setVisible(false)
                            }
                            // Si los regustros que obtuvo son menos que los solicitados, sin importar si es la primera llamada o no, oculto el botón "Cargar más"
                            if(res.length < top){
                                var btn = that.getView().byId("loadMoreFactContP")
                                btn.setVisible(false)
                            }

                        } else {
                            // Si no trajo registros muestro mensaje y oculto botón de "Cargar más"
                            var btn = that.getView().byId("loadMoreFactContP")
                            btn.setVisible(false)
                            MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                        } 

                        that.getView().setBusy(false);                       
                    },
                    error: (error) => {
                        tableModel.setProperty('/Error', error)
                        that.getView().setBusy(false);
                    }
                })               
            },


            getColumnsFacturasNoCont: function(oEvent){
                var aCols = [], EdmType = exportLibrary.EdmType;

                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("nroFactura"),
                    type: EdmType.String,
                    property: 'Factura'
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("sociedad"),
                    property: 'SociedadDesc',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("claseDocumento"),
                    type: EdmType.String,
                    property: 'ClaseDocDesc'
                });
                if(this.getView().getModel().getProperty("/isFactoring")) {
                    aCols.push({
                        label: this.getView().getModel("i18n").getResourceBundle().getText("RUT"),
                        property: 'RUT',
                        type: EdmType.String
                    });
                    aCols.push({
                        label: this.getView().getModel("i18n").getResourceBundle().getText("proveedor"),
                        property: 'NombreProv',
                        type: EdmType.String
                    });        
                }
                aCols.push({
                    property: this.getView().getModel("i18n").getResourceBundle().getText("fechaEmision"),
                    property: 'FechaEmision',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("moneda"),
                    property: 'Moneda',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("monto"),
                    type: EdmType.String,
                    property: 'Monto'
                });
                aCols.push({
                    property: this.getView().getModel("i18n").getResourceBundle().getText("fechaRecepcion"),
                    property: 'FechaRecep',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("estado"),
                    property: 'Estado',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("estadoDocumento"),
                    type: EdmType.String,
                    property: 'EstadoDocumento'
                });

                return aCols;
            },

            onExportFacturasProvOld: function (oEvent) {

                this.getView().setBusy(true);

                var aCols = [], oRowBinding, oSettings, oSheet;

                aCols = this.getColumnsFacturasNoCont();

                // Recupera del modelo los últimos filtros usados en la búsqueda
                var aFilters = this.oModel.getProperty('/arrayFiltrosFactNoCont')

                // Hace la llamada para generar el excel con todos los datos que cumplan los filtros
                // El servicio devuelve 10 registros si no se para top, se hace un top de 2000 asumiendo que no se llegara a ese numero
                var FilterStatusP = new Filter({ path: "TipoUsuario", operator: FilterOperator.EQ, value1: 'P' });

                var pFilters = [...aFilters, FilterStatusP];

                var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});


                var that = this;
                this.oDataModel.read("/FacturasNCSet", {
                    urlParameters: {"$top":2000, "$skip":0},
                    filters : pFilters,
                    success: (data) => {
                        var fecha;

                        data.results.forEach((unRes) =>{
                            fecha = unRes['FechaEmision'];
                            if(fecha){ 
                                unRes['FechaEmision'] = dateFormatter.format(dateFormatter.parse(fecha));
                            }else{
                                unRes['FechaEmision'] = '-';
                            }

                            fecha = unRes['FechaRecepcion'];
                            if(fecha){
                                unRes['FechaRecepcion'] = dateFormatter.format(dateFormatter.parse(fecha));
                            }else{
                                unRes['FechaRecepcion'] = '-';
                            }

                            var statusText = that.formatter.statusText.bind(that)

                            unRes['Monto'] = that.formatter.numberDots(unRes['Monto'],unRes['Moneda']);
                            unRes['Estado'] = statusText(unRes['Estado']);
                            unRes['Factura'] = that.formatter.invoiceNumber(unRes['Factura']);

                        })

                        oSettings = {
                            workbook: {
                                columns: aCols,
                                hierarchyLevel: 'Level'
                            },
                            dataSource: data.results,
                            fileName: 'FacturasNoContProveedores.xlsx',
                        };

                        oSheet = new Spreadsheet(oSettings);
                        oSheet.build().finally(function() {
                            oSheet.destroy();
                        });
                        that.getView().setBusy(false);
                    },
                    error: (e) => { 
                        MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                        that.getView().setBusy(false);
                    }
                })
            },

            'onExportFacturasProv': function (oEvent) {
                const oController = this;
                oController.getView().setBusy(true);

                const aCols = oController.getColumnsFacturasNoCont();

                // Fetch the filters from the model
                const aFilters = oController.oModel.getProperty('/arrayFiltrosFactNoCont');

                // Compute filter for the users 'P' Proveedor
                const FilterStatusP = new Filter({ path: "TipoUsuario", operator: FilterOperator.EQ, value1: 'P' });

                const filters = [...aFilters, FilterStatusP];

                const dataFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                const doExport = (data) => {
                    oController.getView().setBusy(false);

                    if (data.length === 0) {
                        MessageToast.show("No hay datos para exportar");
                        return;
                    }

                    const finalResults = data.map((unRes) => {
                        const fechaEmision = unRes['FechaEmision'];
                        const fechaRecepcion = unRes['FechaRecepcion'];
                        return Object.assign({
                            'FechaEmision': fechaEmision ? dataFormatter.format(dataFormatter.parse(fechaEmision)) : '-',
                            'FechaRecepcion': fechaRecepcion ? dataFormatter.format(dataFormatter.parse(fechaRecepcion)) : '-',
                            'Monto': oController.formatter.numberDots(unRes['Monto'],unRes['Moneda']),
                            'Estado': oController.formatter.statusText.call(oController, unRes['Estado']),
                            'Factura': oController.formatter.invoiceNumber.call(oController, unRes['Factura']),
                        }, unRes);
                    });


                    const oSettings = {
                        'workbook': {
                            'columns': aCols,
                            'hierarchyLevel': 'Level',
                        },
                        'dataSource': finalResults,
                        'fileName': 'FacturasNoContProveedores.xlsx',
                    };

                    const oSheet = new Spreadsheet(oSettings);
                    oSheet.build().finally(function() {
                        oSheet.destroy();
                    });

                };

                const pageSize = 100;

                const fetchNextPage = (accData) => (data) => {
                    const newData = accData.concat(data.results);
                    if (data.results.length < pageSize) {
                        doExport(newData);
                    } else {
                        oController.getEntityWithPagination({
                            entity: 'FacturasNCSet',
                            top: pageSize,
                            skip: newData.length,
                            filters: filters,
                            success: fetchNextPage(newData),
                            error: (e) => {
                                MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                                that.getView().setBusy(false);
                            },
                            controller: oController,
                        });
                    }
                };

                // Fetch the first page
                oController.getEntityWithPagination({
                    entity: 'FacturasNCSet',
                    top: pageSize,
                    skip: 0,
                    filters: filters,
                    success: fetchNextPage([]),
                    error: (e) => {
                        MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                        that.getView().setBusy(false);
                    },
                    controller: oController,
                });
            },

            'getEntityWithPagination': ({entity: entity, top=10,skip=0, filters=[], success, error, controller}) => {
                controller.oDataModel.read(`/${entity}`, {
                    urlParameters: {"$top":top, "$skip":skip},
                    filters : filters,
                    success: success,
                    error: error,
                });
            },

            'onExportFacturasFact': function (oEvent) {
                const oController = this;
                oController.getView().setBusy(true);

                const aCols = oController.getColumnsFacturasNoCont();

                // Fetch the filters from the model
                const aFilters = oController.oModel.getProperty('/arrayFiltrosFactNoCont');

                // Compute filter for the users 'F' Factoringo
                const FilterStatusF = new Filter({ path: "TipoUsuario", operator: FilterOperator.EQ, value1: 'F' });

                const filters = [...aFilters, FilterStatusF];

                const dataFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                const doExport = (data) => {
                    oController.getView().setBusy(false);

                    if (data.length === 0) {
                        MessageToast.show("No hay datos para exportar");
                        return;
                    }

                    const finalResults = data.map((unRes) => {
                        const fechaEmision = unRes['FechaEmision'];
                        const fechaRecepcion = unRes['FechaRecepcion'];
                        return Object.assign({
                            'FechaEmision': fechaEmision ? dataFormatter.format(dataFormatter.parse(fechaEmision)) : '-',
                            'FechaRecepcion': fechaRecepcion ? dataFormatter.format(dataFormatter.parse(fechaRecepcion)) : '-',
                            'Monto': oController.formatter.numberDots(unRes['Monto'],unRes['Moneda']),
                            'Estado': oController.formatter.statusText.call(oController, unRes['Estado']),
                            'Factura': oController.formatter.invoiceNumber.call(oController, unRes['Factura']),
                        }, unRes);
                    });

                    const oSettings = {
                        'workbook': {
                            'columns': aCols,
                            'hierarchyLevel': 'Level',
                        },
                        'dataSource': finalResults,
                        'fileName': 'FacturasNoContFactoring.xlsx',
                    };

                    const oSheet = new Spreadsheet(oSettings);
                    oSheet.build().finally(function() {
                        oSheet.destroy();
                    });

                };

                const pageSize = 100;

                const fetchNextPage = (accData) => (data) => {
                    const newData = accData.concat(data.results);
                    if (data.results.length < pageSize) {
                        doExport(newData);
                    } else {
                        oController.getEntityWithPagination({
                            entity: 'FacturasNCSet',
                            top: pageSize,
                            skip: newData.length,
                            filters: filters,
                            success: fetchNextPage(newData),
                            error: (e) => {
                                MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                                that.getView().setBusy(false);
                            },
                            controller: oController,
                        });
                    }
                };

                // Fetch the first page
                oController.getEntityWithPagination({
                    entity: 'FacturasNCSet',
                    top: pageSize,
                    skip: 0,
                    filters: filters,
                    success: fetchNextPage([]),
                    error: (e) => {
                        MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                        that.getView().setBusy(false);
                    },
                    controller: oController,
                });

            },


            getColumnsFacturasCont: function(oEvent){
                var aCols = [], EdmType = exportLibrary.EdmType;

                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("referencia"),
                    property: 'Referencia',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("sociedad"),
                    property: 'SociedadDesc',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("claseDocumento"),
                    type: EdmType.String,
                    property: 'ClaseDocDesc'
                });
                if(this.getView().getModel().getProperty("/isFactoring")) {
                    aCols.push({
                        label: this.getView().getModel("i18n").getResourceBundle().getText("RUT"),
                        property: 'RUT',
                        type: EdmType.String
                    });
                    aCols.push({
                        label: this.getView().getModel("i18n").getResourceBundle().getText("proveedor"),
                        property: 'NombreProv',
                        type: EdmType.String
                    });        
                }
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("viaPago"),
                    property: 'ViaPagoDesc',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("condicionPago"),
                    type: EdmType.String,
                    property: 'CondicionPagoDesc'
                });

                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("bloqueadaPago"),
                    property: 'BloqueadaPago',
                    type: EdmType.String,
                });
                if(this.getView().getModel().getProperty("/isProveedor")) {
                    aCols.push({
                        label: this.getView().getModel("i18n").getResourceBundle().getText("beneficiarioFinal"),
                        property: 'NombreBenef',
                        type: EdmType.String
                    });
                    aCols.push({
                        label: this.getView().getModel("i18n").getResourceBundle().getText("beneficiarioFinalRUT"),
                        property: 'Beneficiario',
                        type: EdmType.String
                    });        
                }
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("fechaDocumento"),
                    type: EdmType.String,
                    property: 'FechaDoc'
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("fechaPago"),
                    property: 'FechaPago',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("moneda"),
                    property: 'Moneda',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("importe"),
                    type: EdmType.String,
                    property: 'Monto',
                    textAlign: 'Right'
                });

                return aCols;
            },

            onExportFacturasContC: function (oEvent) {

                this.getView().setBusy(true);

                var aCols = [], oRowBinding, oSettings, oSheet;

                aCols = this.getColumnsFacturasCont();

                // Recupera del modelo los últimos filtros usados en la búsqueda
                var aFilters = this.oModel.getProperty('/arrayFiltrosFactCont')

                // Hace la llamada para generar el excel con todos los datos que cumplan los filtros
                // El servicio devuelve 10 registros si no se pasa top, se hace un top de 2000 asumiendo que no se llegara a ese numero
                var FilterStatusC = new Filter({ path: "Status", operator: FilterOperator.EQ, value1: 'C' });

                var cFilters = [...aFilters, FilterStatusC];

                var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                var that = this;
                this.oDataModel.read("/FacturasCSet", {
                    urlParameters: {"$top":2000, "$skip":0},
                    filters : cFilters,
                    success: (data) => {
                        var fecha;

                        data.results.forEach((unRes) =>{
                            fecha = unRes['FechaDoc'];
                            if(fecha){ 
                                unRes['FechaDoc'] = `${fecha.substr(6,2)}/${fecha.substr(4,2)}/${fecha.substr(0,4)}`//dateFormatter.format(dateFormatter.parse(fecha));
                            }else{
                                unRes['FechaDoc'] = '-';
                            }

                            fecha = unRes['FechaPago'];
                            if(fecha){
                                unRes['FechaPago'] = dateFormatter.format(dateFormatter.parse(fecha));
                            }else{
                                unRes['FechaPago'] = '-';
                            }
                            var blockedText = that.formatter.blockedText.bind(that);

                            unRes['Monto'] = that.formatter.numberDots(unRes['Monto'],unRes['Moneda']);
                            unRes['BloqueadaPago'] = blockedText(unRes['BloqueadaPago']);
                            unRes['Referencia'] = that.formatter.invoiceNumber(unRes['Referencia']);
                        })

                        oSettings = {
                            workbook: {
                                columns: aCols,
                                hierarchyLevel: 'Level'
                            },
                            dataSource: data.results,
                            fileName: 'FacturasContC.xlsx',
                        };

                        oSheet = new Spreadsheet(oSettings);
                        oSheet.build().finally(function() {
                            oSheet.destroy();
                        });
                        that.getView().setBusy(false);
                    },
                    error: (e) => { 
                        MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                        that.getView().setBusy(false);
                    }
                })
            },
            onExportFacturasContP: function (oEvent) {

                this.getView().setBusy(true);

                var aCols = [], oRowBinding, oSettings, oSheet;

                aCols = this.getColumnsFacturasCont();

                // Recupera del modelo los últimos filtros usados en la búsqueda
                var aFilters = this.oModel.getProperty('/arrayFiltrosFactCont')

                // Hace la llamada para generar el excel con todos los datos que cumplan los filtros
                // El servicio devuelve 10 registros si no se para top, se hace un top de 2000 asumiendo que no se llegara a ese numero
                var FilterStatusP = new Filter({ path: "Status", operator: FilterOperator.EQ, value1: 'P' });

                var pFilters = [...aFilters, FilterStatusP];

                var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                var that = this;
                this.oDataModel.read("/FacturasCSet", {
                    urlParameters: {"$top":2000, "$skip":0},
                    filters : pFilters,
                    success: (data) => {
                        var fecha;

                        data.results.forEach((unRes) =>{
                            fecha = unRes['FechaDoc'];
                            if(fecha){ 
                                unRes['FechaDoc'] = `${fecha.substr(6,2)}/${fecha.substr(4,2)}/${fecha.substr(0,4)}`//dateFormatter.format(dateFormatter.parse(fecha));
                            }else{
                                unRes['FechaDoc'] = '-';
                            }

                            fecha = unRes['FechaPago'];
                            if(fecha){
                                unRes['FechaPago'] = dateFormatter.format(dateFormatter.parse(fecha));
                            }else{
                                unRes['FechaPago'] = '-';
                            }

                            var blockedText = that.formatter.blockedText.bind(that);

                            unRes['Monto'] = that.formatter.numberDots(unRes['Monto'],unRes['Moneda']);
                            unRes['BloqueadaPago'] = blockedText(unRes['BloqueadaPago']);
                            unRes['Referencia'] = that.formatter.invoiceNumber(unRes['Referencia']);

                        })

                        oSettings = {
                            workbook: {
                                columns: aCols,
                                hierarchyLevel: 'Level'
                            },
                            dataSource: data.results,
                            fileName: 'FacturasContP.xlsx',
                        };

                        oSheet = new Spreadsheet(oSettings);
                        oSheet.build().finally(function() {
                            oSheet.destroy();
                        });
                        that.getView().setBusy(false);
                    },
                    error: (e) => { 
                        MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                        that.getView().setBusy(false);
                    }
                })
            },


        });
    }
);

// vim: ts=4 sw=4 sts=4 expandtab
