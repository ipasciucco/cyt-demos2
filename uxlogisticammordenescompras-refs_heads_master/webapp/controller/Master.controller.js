sap.ui.define([
    // "sap/ui/core/mvc/Controller",
    "com/cyt/zuxportalesbase2021111116/controller/Base.controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/model/odata/v2/ODataModel",
    'sap/ui/export/library',
    'sap/ui/export/Spreadsheet',
    'com/cyt/zuxportalesbase2021111116/model/formatter',
    'sap/ui/core/format/DateFormat',
    'com/cyt/zmmportalproveedoresordenescompras2021111116/utils/utils',
	'sap/m/Token',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
	'sap/ui/model/type/String',
	'sap/m/ColumnListItem',
	'sap/m/Label',
	'sap/m/SearchField',
    'com/cyt/zmmportalproveedoresordenescompras2021111116/utils/html2pdf'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Base, MessageToast, MessageBox, JSONModel, Fragment, ODataModel, exportLibrary, Spreadsheet, formatter, DateFormat, utils, Token, Filter, FilterOperator, TypeString, ColumnListItem, Label, SearchField) {
        "use strict";

        return Base.extend("com.cyt.zmmportalproveedoresordenescompras2021111116.controller.Master", {
            _pDialogPDF: new Map(),
            formatter: Object.assign({
                formatCurrency: function(amount) {

                    if (!amount) {
                        console.log(`formatCurrency: amount is ${amount}`);
                        return '';
                    }

                    const [integer, decimal] = amount.split(',');
                    const ints = parseInt(integer.replace(/\./g,''));

                    // Convert the first two digits of the integer part to a string
                    const cents = parseInt(decimal.substring(0, 2));
                    const total = ints * 100 + cents;

                    return `${total / 100},${String(total % 100).padStart(2, '0')}`;
                },
            }, formatter ),
            'onInit': function () {

                // Inicializa OdataModel
                var appBaseUrl = jQuery.sap.getModulePath("com.cyt.zuxportalesbase2021111116");
                var serviceDest = 'ECC_CYT_HTTP_PTALPROV';
                this.oDataModel = new ODataModel(appBaseUrl + '/proxy/' + serviceDest + '/sap/opu/odata/sap/ZCL_MM_PORTAL_PRO_SRV', { useBatch: false });

                // Genera modelo con url base para imagenes
                var imgBasePath = jQuery.sap.getModulePath("com.cyt.zmmportalproveedoresordenescompras2021111116");
                var imgBaseConf = new JSONModel({ imgBasePath: imgBasePath });
                this.getView().setModel(imgBaseConf, "imgBaseConf");

                // Instancia modelo para los filtros
                var oModel = new JSONModel();
                this.getView().setModel(oModel);
                this.oModel = oModel;

                // Trae listado de sociedades para el filtro por sociedad
                var that = this;
                this.oDataModel.read('/ValueHelpSet', {
                    filters: [new sap.ui.model.Filter({ path: "Code", operator: sap.ui.model.FilterOperator.EQ, value1: 'Sociedad' })],
                    success: (data) => { that.oModel.setProperty('/SociedadesCollection', data.results) },
                    error: (e) => { MessageToast.show("{i18n>error}") }
                })

                this.getProveedores();

                // Instancia filtros materiales y servicios
                // Para pendientes e historico se utiliza el mismo filtro
                this._clearModelMateriales();
                this._clearModelServicios();



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


                this.isInterno = false;
                $.ajax({
                    url: appBaseUrl + "/userinfo",
                    type: 'GET',
                    success: (data)=>{ 
                        let userInfo = JSON.parse(data)
                        this.isInterno = userInfo['xs.system.attributes']?.['xs.rolecollections']?.includes('Z_UX_LOGISTICA_PORTAL_PROVEEDORES_INTERNOS')

                        this.onSearchServicios({ top: 10, skip: 0 , status: ['P','H']});
                        this.searchMateriales();
                    },
                    error: (e)=>{console.log(e)}
                }); 
                
            },

            getProveedores: function() {
                var that = this;
                this.oDataModel.read('/ValueHelpSet', {
                    //urlParameters: {"$top":10, "$skip":0},
                    filters: [new Filter({path: "Code", operator: FilterOperator.EQ, value1: 'Proveedor' })],
                    success: (data) => {that.oModel.setProperty('/ProveedorCollection',data.results)},
                    error: (e) => {MessageToast.show("{i18n>error}")}
                })
            },

            searchMateriales: function () {
                this.onSearchMateriales({ top: 10, skip: 0 });
                this.onSearchMaterialesHistorico({ top: 10, skip: 0 });
            },

            _clearModelServicios: function () {
                // Se crean filtros base para los servicios
                var dateStart = new Date();
                var dateEnd = new Date();
                var minimumDate = new Date();
                dateStart.setMonth(dateEnd.getMonth() - 3);
                minimumDate.setMonth(dateEnd.getMonth() - 6);    

                this.oModel.setProperty('/filtrosServicios', {
                    Orden: '',
                    Posicion: '',
                    Desde: dateStart.toLocaleDateString('en-GB'),
                    Hasta: dateEnd.toLocaleDateString('en-GB'),
                    minimumDate: minimumDate,
                });
            },

            _clearModelMateriales: function () {
                // Se crean filtros base para las ordenes de materiales
                var dateStart = new Date();
                var dateEnd = new Date();
                var minimumDate = new Date();
                dateStart.setMonth(dateEnd.getMonth() - 3);
                minimumDate.setMonth(dateEnd.getMonth() - 6);    

                this.oModel.setProperty('/filtrosMateriales', {
                    Sociedad: '',
                    Pedido: '',
                    Material: '',
                    Desde: dateStart.toLocaleDateString('en-GB'),
                    Hasta: dateEnd.toLocaleDateString('en-GB'),
                    minimumDate: minimumDate
                });
            },

            // loadServicios: function () {
            //     // Cargar mas Servicios
            //     var servicios = this.getView().getModel("ocServicios").getData()
            //     this.onSearchServicios({ top: 2000, skip: servicios.ocServicios.length , status: ['P']})
            // },

            loadServiciosHist: function () {
                // Cargar mas Servicios
                var servicios = this.getView().getModel("ocServiciosHist").getData()
                this.onSearchServicios({ top: 10, skip: servicios.ocServicios.length , status: ['H']})
            },

            loadPendientes: function () {
                // Cargar mas registros de ordenes pendientes
                var servicios = this.getView().getModel("ocMaterialesPendientes").getData()
                this.onSearchMateriales({ top: 10, skip: servicios.ocMaterialesPendientes.length })
            },

            loadHistorico: function () {
                // Cargar mas registros de historico de ordenes
                var servicios = this.getView().getModel("ocMateriales").getData()
                this.onSearchMaterialesHistorico({ top: 10, skip: servicios.ocMateriales.length })
            },

            changeTokensMateriales: function (oEvent) {
                setTimeout(()=>{this.searchMateriales()}, 500)
            },

            // Buscar Materiales Pendientes
            onSearchMateriales: function ({ top = 10, skip = 0 }) {

                // Se generan filtros
                var oFilter = this.oModel.getProperty('/filtrosMateriales');
                var aFilters = new Array();
                var date, fecha, fechaString;
                if (oFilter.Sociedad) {
                    var FilterSociedad = new sap.ui.model.Filter({
                        path: "SociedadDesc",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: oFilter.Sociedad
                    });
                    aFilters.push(FilterSociedad)
                }
                if (oFilter.Pedido) {
                    var FilterPedido = new sap.ui.model.Filter({
                        path: "Pedido",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: oFilter.Pedido
                    });
                    aFilters.push(FilterPedido)
                }
                if (oFilter.Material) {
                    var FilterMaterial = new sap.ui.model.Filter({
                        path: "MaterialDesc",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: oFilter.Material
                    });
                    aFilters.push(FilterMaterial)
                }

                // Filtros proveedores
                var filterProvAux = [];
                var tokens = this.byId("multiInputProvM").getTokens();
                if(tokens.length > 0 ){
                    tokens.map((unProv)=>{
                        filterProvAux.push( new Filter({path: 'Proveedor', operator: FilterOperator.EQ, value1: unProv.getKey()}) )
                    })
                    var filterProvs = new Filter({
                        filters: filterProvAux,
                        and: false
                    })
                    aFilters.push(filterProvs);
                }
                
                if (oFilter.Desde) {
                    date = new Date(oFilter.Desde)
                    fecha = oFilter.Desde.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterDesde = new sap.ui.model.Filter({
                        path: "Fecha_Desde",
                        operator: sap.ui.model.FilterOperator.GE,
                        value1: fechaString,
                    });
                    aFilters.push(FilterDesde)
                }
                if (oFilter.Hasta) {
                    date = new Date(oFilter.Hasta)
                    fecha = oFilter.Hasta.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterHasta = new sap.ui.model.Filter({
                        path: "Fecha_Hasta",
                        operator: sap.ui.model.FilterOperator.LE,
                        value1: fechaString
                    });
                    aFilters.push(FilterHasta)
                }
                // Se setean los filtros en el modelo para tomar en caso de generar excel
                this.oModel.setProperty('/arrayFiltrosMateriales', aFilters)

                var table = this.getView().byId("ocMateriales")
                table.setBusy(true)
                // Consume servicio de ordenes de compras pendientes de materiales
                var that = this;
                this.oDataModel.read("/OCProveedorSet", {
                    urlParameters: {
                        "$expand": "OrdPendientesSet,OrdPendientesSet/MatPendientesSet",
                        "$top": top,
                        "$skip": skip
                    },
                    filters: aFilters,
                    success: (data) => {
                        var res, fecha;

                        // Si es la primera llamada inicializa el modelo 
                        if (skip == 0) {
                            var tableModelMaterialesPend = new JSONModel({ 'ocMaterialesPendientes': [] });
                            this.getView().setModel(tableModelMaterialesPend, "ocMaterialesPendientes")
                            this.getView().getModel("ocMaterialesPendientes").setSizeLimit(999999)

                            var btn = that.getView().byId("loadMorePendientes")
                            btn.setVisible(true)

                        }

                        var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                        // Se obtienen los registros de la response
                        res = data.results ? data.results[0].OrdPendientesSet.results : []
                        if (res.length > 0) {
                            // Se formatean las fechas
                            res.map((unRes) => {
                                // fecha = unRes['Fecha']
                                // unRes['Fecha'] = `${fecha.substring(6, 8)}/${fecha.substring(4, 6)}/${fecha.substring(0, 4)}`
                                // unRes['MatPendientesSet'].results.map((unRes) => {
                                //     fecha = unRes['FechaEntrega']
                                //     unRes['FechaEntrega'] = `${fecha.substring(6, 8)}/${fecha.substring(4, 6)}/${fecha.substring(0, 4)}`
                                // })

                                fecha = unRes['Fecha']
                                if(fecha){
                                    unRes['Fecha'] = dateFormatter.format(dateFormatter.parse(fecha));
                                } else {
                                    unRes['Fecha'] = '-'
                                }
                                unRes['MatPendientesSet'].results.map((unRes)=> {
                                    fecha = unRes['FechaEntrega']
                                    if(fecha){
                                        unRes['FechaEntrega'] = dateFormatter.format(dateFormatter.parse(fecha));
                                    } else {
                                        unRes['FechaEntrega'] = '-'
                                    }        
                                })
                            })

                            // Se obtienen los registros del modelo, se concatenan los obtenidos del servicio y se vuelven a setear en el modelo
                            var pendientes = that.getView().getModel("ocMaterialesPendientes").getData()
                            pendientes = pendientes.ocMaterialesPendientes.concat(res)

                            var tableModel = new JSONModel({ 'ocMaterialesPendientes': pendientes });
                            tableModel.setSizeLimit(999999)
                            that.getView().setModel(tableModel, "ocMaterialesPendientes")
                            that.getView().getModel("ocMaterialesPendientes").setSizeLimit(999999)

                            // Si la cantidad de registros obtenidos es menos a la solicitada y no es la primera llamada se muestra mensaje indicando que no hay mas registros y se oculta el boton
                            if (res.length < top && skip > 0) {
                                var btn = that.getView().byId("loadMorePendientes")
                                btn.setVisible(false)
                                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                            }
                            // Si los registros que obtuvo son menos que los solicitados, sin importar si es la primera llamada o no, oculto el botón "Cargar más"
                            if (res.length < top) {
                                var btn = that.getView().byId("loadMorePendientes")
                                btn.setVisible(false)
                            }
                        } else {
                            // Si no trajo registros se muestra mensaje y se oculta el boton de "Cargar mas"
                            var btn = that.getView().byId("loadMorePendientes")
                            btn.setVisible(false)
                            if ( skip > 0 ) {
                                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                            }
                        }
                        table.setBusy(false)
                    },
                    error: (error) => {
                        table.setBusy(false)
                        MessageToast.show(error)
                    }
                })
            },

            // Buscar Materiales Historico
            onSearchMaterialesHistorico: function ({ top = 10, skip = 0 }) {

                // Se generan filtros
                var oFilter = this.oModel.getProperty('/filtrosMateriales');
                var aFilters = new Array();
                var date, fecha, fechaString;
                if (oFilter.Sociedad) {
                    var FilterSociedad = new sap.ui.model.Filter({
                        path: "SociedadDesc",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: oFilter.Sociedad
                    });
                    aFilters.push(FilterSociedad)
                }
                if (oFilter.Pedido) {
                    var FilterPedido = new sap.ui.model.Filter({
                        path: "Pedido",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: oFilter.Pedido
                    });
                    aFilters.push(FilterPedido)
                }
                if (oFilter.Material) {
                    var FilterMaterial = new sap.ui.model.Filter({
                        path: "MaterialDesc",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: oFilter.Material
                    });
                    aFilters.push(FilterMaterial)
                }

                // Filtros proveedores
                var filterProvAux = [];
                var tokens = this.byId("multiInputProvM").getTokens();
                if(tokens.length > 0 ){
                    tokens.map((unProv)=>{
                        filterProvAux.push( new Filter({path: 'Proveedor', operator: FilterOperator.EQ, value1: unProv.getKey()}) )
                    })
                    var filterProvs = new Filter({
                        filters: filterProvAux,
                        and: false
                    })
                    aFilters.push(filterProvs);
                }

                if (oFilter.Desde) {
                    date = new Date(oFilter.Desde)
                    fecha = oFilter.Desde.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterDesde = new sap.ui.model.Filter({
                        path: "Fecha_Desde",
                        operator: sap.ui.model.FilterOperator.GE,
                        value1: fechaString,
                    });
                    aFilters.push(FilterDesde)
                }
                if (oFilter.Hasta) {
                    date = new Date(oFilter.Hasta)
                    fecha = oFilter.Hasta.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterHasta = new sap.ui.model.Filter({
                        path: "Fecha_Hasta",
                        operator: sap.ui.model.FilterOperator.LE,
                        value1: fechaString
                    });
                    aFilters.push(FilterHasta)
                }
                // Se setean los filtros en el modelo para tomar en caso de generar excel
                this.oModel.setProperty('/arrayFiltrosMateriales', aFilters)

                var table = this.getView().byId("tableOCMaterialesHistorial")
                table.setBusy(true)

                var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                // Se consume servicio de Historico de Ordenes
                var that = this;
                this.oDataModel.read("/OCProveedorSet", {
                    urlParameters: {
                        "$expand": "OrdenesSet,OrdenesSet/ItemsSet",
                        "$top": top,
                        "$skip": skip
                    },
                    filters: aFilters,
                    success: (data) => {
                        var res, fecha;

                        // Si es la primera llamada con los filtros se inicializa el modelo
                        if (skip == 0) {
                            var tableModelMateriales = new JSONModel({ 'ocMateriales': [] });
                            this.getView().setModel(tableModelMateriales, "ocMateriales")
                            this.getView().getModel("ocMateriales").setSizeLimit(999999)

                            var btn = that.getView().byId("loadMoreHistorico")
                            btn.setVisible(true)
                        }



                        // Se obtienen los datos de la response
                        res = data.results ? data.results[0].OrdenesSet.results : []

                        // Si trajo registros
                        if (res.length > 0) {
                            // Se formatean las fechas
                            res.map((unRes) => {
                                // fecha = unRes['Fecha']
                                // unRes['Fecha'] = `${fecha.substring(6, 8)}/${fecha.substring(4, 6)}/${fecha.substring(0, 4)}`
                                // unRes['ItemsSet'].results.map((unRes) => {
                                //     fecha = unRes['FechaEntrega']
                                //     unRes['FechaEntrega'] = `${fecha.substring(6, 8)}/${fecha.substring(4, 6)}/${fecha.substring(0, 4)}`
                                // })
                                fecha = unRes['Fecha']
                                if(fecha){
                                    unRes['Fecha'] = dateFormatter.format(dateFormatter.parse(fecha));
                                } else {
                                    unRes['Fecha'] = '-'
                                }
                                unRes['ItemsSet'].results.map((unRes)=> {
                                    fecha = unRes['FechaEntrega']
                                    if(fecha){
                                        unRes['FechaEntrega'] = dateFormatter.format(dateFormatter.parse(fecha));
                                    } else {
                                        unRes['FechaEntrega'] = '-'
                                    }        
                                })

                                unRes['Importe'] = that.formatter.numberDots(unRes['Importe'],unRes['Moneda']);
                                unRes['MatPendientesSet'] = unRes['ItemsSet']
                            })

                            

                            // Se obtienen los registros, se concatenan con el modelo inicializado y se vuelve a setear en el modelo
                            var materiales = that.getView().getModel("ocMateriales").getData()
                            materiales = materiales.ocMateriales.concat(res)
                            var tableModel = new JSONModel({ 'ocMateriales': materiales });
                            tableModel.setSizeLimit(999999)
                            that.getView().setModel(tableModel, "ocMateriales")
                            //that.getView().getModel("ocMateriales").setSizeLimit(999999)


                            // Si los registros que obtuvo son menos que los solicitados y no es la primera llamada muestro un mensaje indicando que no hay más registros y oculto el botón "Cargar más"
                            if (res.length < top && skip > 0) {
                                var btn = that.getView().byId("loadMoreHistorico")
                                btn.setVisible(false)
                                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                            }
                            // Si los regustros que obtuvo son menos que los solicitados, sin importar si es la primera llamada o no, oculto el botón "Cargar más"
                            if (res.length < top) {
                                var btn = that.getView().byId("loadMoreHistorico")
                                btn.setVisible(false)
                            }
                        } else {
                            // Si no trajo registros muestro mensaje y oculto botón de "Cargar más"
                            var btn = that.getView().byId("loadMoreHistorico")
                            btn.setVisible(false)
                            if (skip > 0) {
                                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                            }
                        }
                        table.setBusy(false)
                    },
                    error: (error) => {
                        table.setBusy(false)
                        MessageToast.show(error)
                    }
                })
            },

            changeTokensServicios: function (oEvent) {
                setTimeout(()=>{this.onSearchServicios({ top: 10, skip: 0 , status: ['P','H']})}, 500)
            },

            // Buscar Servicios
            onSearchServicios: function ({ top = 10, skip = 0 , status = ['P','H']}) {
                var oFilter = this.oModel.getProperty('/filtrosServicios');
                var aFilters = new Array();
                var date, fecha, fechaString;

                if (oFilter.Orden) {
                    var FilterOrden = new sap.ui.model.Filter({
                        path: "Orden",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: oFilter.Orden
                    });
                    aFilters.push(FilterOrden)
                }
                if (oFilter.Posicion) {
                    var FilterPosicion = new sap.ui.model.Filter({
                        path: "Posicion",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: oFilter.Posicion
                    });
                    aFilters.push(FilterPosicion)
                }

                // Filtros proveedores
                var filterProvAux = [];
                var tokens = this.byId("multiInputProvS").getTokens();
                if(tokens.length > 0 ){
                    tokens.map((unProv)=>{
                        filterProvAux.push( new Filter({path: 'Proveedor', operator: FilterOperator.EQ, value1: unProv.getKey()}) )
                    })
                    var filterProvs = new Filter({
                        filters: filterProvAux,
                        and: false
                    })
                    aFilters.push(filterProvs);
                }

                if (oFilter.Desde) {
                    date = new Date(oFilter.Desde)
                    fecha = oFilter.Desde.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterDesde = new sap.ui.model.Filter({
                        path: "Fecha",
                        operator: sap.ui.model.FilterOperator.GE,
                        value1: fechaString,
                    });
                    aFilters.push(FilterDesde)
                }
                if (oFilter.Hasta) {
                    date = new Date(oFilter.Hasta)
                    fecha = oFilter.Hasta.split("/");
                    fechaString = `${fecha[2]}${fecha[1]}${fecha[0]}`

                    var FilterHasta = new sap.ui.model.Filter({
                        path: "Fecha",
                        operator: sap.ui.model.FilterOperator.LE,
                        value1: fechaString
                    });
                    aFilters.push(FilterHasta)
                }

                this.oModel.setProperty('/arrayFiltrosServicios', aFilters)

                var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});
            
                var that = this;
                status.forEach(function(stat){
                    var tableName = (stat === 'P'?"tableServicios":"tableServiciosHist");


                    var filtersWithStat = Object.assign([],aFilters);
                    filtersWithStat.push(new sap.ui.model.Filter({
                        path: "Status",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: stat
                    }));

                    if (stat === 'P' && this.isInterno && this.byId("multiInputProvS").getTokens().length === 0) {
                        this.byId("messageInternos").setVisible(true)
                        var tableModelServicios = new JSONModel({ 'ocServicios': [] });
                        this.getView().setModel(tableModelServicios, "ocServicios")            

                    } else {
                        if (stat === 'P') {
                            this.byId("messageInternos").setVisible(false)
                            top = 1000;
                            skip = 0;
                        };
                        var table = this.getView().byId(tableName)
                        table.setBusy(true)

                        this.oDataModel.read("/OCServicioSet", {
                            urlParameters: { "$expand": "HItemsSet,SItemsSet", "$top": top, "$skip": skip },
                            filters: filtersWithStat,
                            success: (data) => {
                                var res, fecha;

                                var modelName = (stat === 'P'?"ocServicios":"ocServiciosHist");
                                var loadMoreName = (stat === 'P'?"loadMoreServicios":"loadMoreServiciosHist");
                                
                                if (skip == 0) {
                                    var tableModelServicios = new JSONModel({ 'ocServicios': [] });
                                    this.getView().setModel(tableModelServicios, modelName)
                                    this.getView().getModel(modelName).setSizeLimit(999999)

                                    var btn = that.getView().byId(loadMoreName)
                                    btn.setVisible(true)
                                }

                                res = data.results;

                                if (res.length > 0) {
                                    res.map((unRes) => {
                                        fecha = unRes['Fecha']
                                        
                                        if (fecha) {
                                            unRes['Fecha'] = dateFormatter.format(dateFormatter.parse(fecha))
                                        } else{
                                            unRes['Fecha'] = '-'
                                        }
                                    
                                        unRes['HItemsSet'].results.map((unRes)=>{
                                            fecha = unRes['Fecha']
                                        
                                            if (fecha) {
                                                unRes['Fecha'] = dateFormatter.format(dateFormatter.parse(fecha))
                                            } else{
                                                unRes['Fecha'] = '-'
                                            }
                                        })
                                    })

                                    var servicios = that.getView().getModel(modelName).getData()
                                    servicios = servicios.ocServicios.concat(res)

                                    var tableModelServicios = new JSONModel({ 'ocServicios': servicios });
                                    that.getView().setModel(tableModelServicios, modelName)

                                    if (res.length < top && skip > 0) {
                                        var btn = that.getView().byId(loadMoreName)
                                        btn.setVisible(false)
                                        MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                                    }
                                    if (res.length < top) {
                                        var btn = that.getView().byId(loadMoreName)
                                        btn.setVisible(false)
                                    }
                                } else {
                                    var btn = that.getView().byId(loadMoreName)
                                    btn.setVisible(false)
                                    if (skip > 0) {
                                        MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("noMoreRows"))
                                    }
                                }
                                table.setBusy(false)

                            },
                            error: (error) => {
                                table.setBusy(false)
                                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("errorLoadingMore"))
                            }
                        });
                    }
                }.bind(this));
            },


            handleTableSelectDialogPress: function (oEvent) {
                var oView = this.getView();
                var details = oEvent.getSource().getBindingContext('ocMaterialesPendientes').getObject();
                var results = details.MatPendientesSet.results;
                var detailsMaterial = new JSONModel({ 'detailsMaterial': results, nroOrden: details.Orden });
                this.getView().setModel(detailsMaterial, "detailsMaterial");

                if (!this._pDialog) {
                    this._pDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.cyt.zmmportalproveedoresordenescompras2021111116.view.fragmentLineasOC",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }

                this._pDialog.then(function (oDialog) {
                    oDialog.open();
                }.bind(this));
            },

            handleTableSelectDialogPressServicePend: function (oEvent){
                this.handleTableSelectDialogPressService(oEvent, 'P');
            },

            handleTableSelectDialogPressServiceHist: function (oEvent){
                this.handleTableSelectDialogPressService(oEvent, 'H');
            },

            handleTableSelectDialogPressService: function (oEvent, status) {
                var oView = this.getView();

                var modelName = (status === 'P'?"ocServicios":"ocServiciosHist");
                var details = oEvent.getSource().getBindingContext(modelName).getObject()
                //var results = status === "P" ? details.SItemsSet.results : details.HItemsSet.results
                var results = details.HItemsSet.results;
                var detailsServicio = new JSONModel({ 'detailsServicio': results });
                this.getView().setModel(detailsServicio, "detailsServicio")

                if (!this._pDialogService) {
                    this._pDialogService = Fragment.load({
                        id: oView.getId() + "2",
                        name: "com.cyt.zmmportalproveedoresordenescompras2021111116.view.fragmentLineasOCServicios",
                        controller: this
                    }).then(function (oDialogService) {
                        oView.addDependent(oDialogService);
                        return oDialogService;
                    });
                }

                this._pDialogService.then(function (oDialogService) {
                    oDialogService.open();
                }.bind(this));
            },

            handleTableSelectDialogPressHistorial: function (oEvent) {
                var oView = this.getView();

                var details = oEvent.getSource().getBindingContext('ocMateriales').getObject();
                var results = details.ItemsSet.results;

                var detailsMaterial = new JSONModel({ 'detailsMaterial': results, nroOrden: details.Orden });
                this.getView().setModel(detailsMaterial, "detailsMaterial");

                if (!this._pDialog) {
                    this._pDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.cyt.zmmportalproveedoresordenescompras2021111116.view.fragmentLineasOC",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }

                this._pDialog.then(function (oDialog) {
                    oDialog.open();
                }.bind(this));
            },


            handleSearchDetalleMaterial: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                // var oFilter = new Filter("NumeroDoc", FilterOperator.Contains, sValue);
                var oFilters = [];
                oFilters.push(new Filter("Item", FilterOperator.Contains, sValue))
                oFilters.push(new Filter("MatDesc", FilterOperator.Contains, sValue))
                var oFilter = new Filter({filters: oFilters, and: false})
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            },

            handleSearchDetalleServicio: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                // var oFilter = new Filter("NumeroDoc", FilterOperator.Contains, sValue);
                var oFilters = [];
                oFilters.push(new Filter("Entrada", FilterOperator.Contains, sValue))
                oFilters.push(new Filter("Texto", FilterOperator.Contains, sValue))
                var oFilter = new Filter({filters: oFilters, and: false})
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            },

            onLinkPress: function (oEvent) {
                var button = '';
                try {
                    button = oEvent.getSource().getProperty('key');
                } catch (e) { }
                var type = '';
                var semObj = '';
                var action = '';
                switch (button) {
                    case 'PortalClientes':
                        type = 'External';
                        semObj = 'PortalClientes';
                        action = 'Display';
                        break;
                    case 'SeguimientoReclamos':
                        type = 'External';
                        semObj = 'SeguimientoReclamos';
                        action = 'Display';
                        break;
                    case 'IngresoReclamos':
                        type = 'External';
                        semObj = 'IngresoReclamos';
                        action = 'Display';
                        break;
                    case 'OrdenesCompra':
                        type = 'External';
                        semObj = 'OrdenesCompras';
                        action = 'Display';
                    default:
                        type = 'External';
                        semObj = 'PortalClientes';
                        action = 'Display';
                        break;
                }

                if (type === 'External') {
                    this.oCrossAppNav = sap.ushell.Container.getService(
                        "CrossApplicationNavigation"
                    );
                    this.oCrossAppNav.toExternal({
                        target: {
                            semanticObject: semObj,
                            action: action
                        }
                    });
                }
            },

            onExportMaterial: function (oEvent) {
                var aCols = [], EdmType = exportLibrary.EdmType, oRowBinding, oSettings, oSheet;
                // Recupera del modelo los últimos filtros usados en la búsqueda
                var aFilters = this.oModel.getProperty('/arrayFiltrosMateriales')

                var table = this.getView().byId("ocMateriales")
                table.setBusy(true)

                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("nroOrden"),
                    property: 'Orden',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("posicion"),
                    property: 'Item',
                    type: EdmType.Number
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("fechaDocumento"),
                    type: EdmType.String,
                    property: 'Fecha'
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("proveedor"),
                    property: 'NombreProv',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("sociedad"),
                    property: 'Soc_text',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("descMaterial"),
                    property: 'MatDesc',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("cantPedida"),
                    property: 'CantPedida',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("cantPendiente"),
                    property: 'CantPendiente',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("fechaEntrega"),
                    property: 'FechaEntrega',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("precioUnit"),
                    property: 'PrecioUnit',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("valor"),
                    property: 'Importe',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("moneda"),
                    property: 'Moneda',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("centro"),
                    property: 'CentroDesc',
                    type: EdmType.String
                });

                var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                var that = this;
                this.oDataModel.read("/OCProveedorSet", {
                    urlParameters: {
                        "$expand": "OrdPendientesSet,OrdPendientesSet/MatPendientesSet",
                        "$top": 2000,
                        "$skip": 0
                    },
                    filters: aFilters,
                    success: (data) => {
                        var fecha;
                        var results = data.results ? data.results[0].OrdPendientesSet.results : []

                        results.map((unRes) => {

                            fecha = unRes['Fecha']
                            if(fecha){
                                unRes['Fecha'] = dateFormatter.format(dateFormatter.parse(fecha));
                            } else {
                                unRes['Fecha'] = '-'
                            }
                            unRes['MatPendientesSet'].results.map((unRes)=> {
                                fecha = unRes['FechaEntrega']
                                if(fecha){
                                    unRes['FechaEntrega'] = dateFormatter.format(dateFormatter.parse(fecha));
                                } else {
                                    unRes['FechaEntrega'] = '-'
                                }
                        
                                unRes['Importe'] = that.formatter.numberDots(unRes['Importe'],unRes['Moneda'])
                                
                            })

                        })


                        var materiales = [];
                        if(data.results){
                            data.results[0].OrdPendientesSet.results.forEach(function(orden){
                                orden.MatPendientesSet.results.forEach(function(a){
                                    var material = {...orden, ...a};
                                    delete material.MatPendientesSet;
                                    material.Item = parseInt(material.Item);
                                    materiales.push(material);
                                })
                            })
                        }
                
                        oSettings = {
                            workbook: {
                                columns: aCols,
                                hierarchyLevel: 'Level'
                            },
                            dataSource: materiales,
                            fileName: 'OrdenesCompra_Materiales.xlsx',
                        };

                        oSheet = new Spreadsheet(oSettings);
                        oSheet.build().finally(function () {
                            oSheet.destroy();
                        });
                        table.setBusy(false)

                    },
                    error: (e) => {
                        MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                        table.setBusy(false)
                    }
                })
            },
            onExportHistorial: function (oEvent) {
                var aCols = [], EdmType = exportLibrary.EdmType, oRowBinding, oSettings, oSheet;

                // Recupera del modelo los últimos filtros usados en la búsqueda
                var aFilters = this.oModel.getProperty('/arrayFiltrosMateriales')

                var table = this.getView().byId("tableOCMaterialesHistorial")
                table.setBusy(true)


                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("nroOrden"),
                    property: 'Orden',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("fechaDocumento"),
                    type: sap.ui.export.EdmType.Date,
                    property: 'Fecha',
                    inputFormat: "yyyymmdd",
                    scale: 0
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("proveedor"),
                    property: 'NombreProveedor',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("sociedad"),
                    property: 'Soc_text',
                    type: EdmType.String
                });

                var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                var that = this;
                this.oDataModel.read("/OCProveedorSet", {
                    urlParameters: {
                        "$expand": "OrdenesSet,OrdenesSet/ItemsSet",
                        "$top": 2000,
                        "$skip": 0
                    },
                    filters: aFilters,
                    success: (data) => {
                        var fecha;

                        data.results.map((unRes)=>{
                            fecha = unRes['FechaEntrega']
                            if(fecha){
                                unRes['FechaEntrega'] = dateFormatter.format(dateFormatter.parse(fecha));
                            } else {
                                unRes['FechaEntrega'] = '-'
                            }
                            unRes['Importe'] = that.formatter.numberDots(unRes['Importe'],unRes['Moneda'])    
                        })

                        oSettings = {
                            workbook: {
                                columns: aCols,
                                hierarchyLevel: 'Level'
                            },
                            dataSource: data.results ? data.results[0].OrdenesSet.results : [],
                            fileName: 'Historial_OrdenesCompra.xlsx',
                        };

                        oSheet = new Spreadsheet(oSettings);
                        oSheet.build().finally(function () {
                            oSheet.destroy();
                        });
                        table.setBusy(false)
                    },
                    error: (e) => {
                        MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                        table.setBusy(false)
                    }
                })
            },

            onExportServiciosPendientes(oEvent){
                this.onExportServicios(oEvent,'P');
            },

            onExportServiciosHist(oEvent){
                this.onExportServicios(oEvent,'H');
            },

            onExportServicios: function (oEvent, status) {
                var aCols = [], EdmType = exportLibrary.EdmType, oRowBinding, oSettings, oSheet;
                var aFilters = this.oModel.getProperty('/arrayFiltrosServicios')

                var filtersWithStat = Object.assign([],aFilters);
                filtersWithStat.push(new sap.ui.model.Filter({
                    path: "Status",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: status
                }));

                var tableName = (status === 'P'?"tableServicios":"tableServiciosHist");
                var table = this.getView().byId(tableName)
                table.setBusy(true)

                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("orden"),
                    property: 'Orden',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("posicion"),
                    type: EdmType.String,
                    property: 'Posicion',
                    scale: 0
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("proveedor"),
                    property: 'NombreProv',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("fechaDocumento"),
                    property: 'Fecha',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("texto"),
                    property: 'Texto',
                    type: EdmType.String
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("importe"),
                    type: EdmType.String,
                    property: 'Importe',
                    scale: 0
                });
                aCols.push({
                    label: this.getView().getModel("i18n").getResourceBundle().getText("moneda"),
                    property: 'Moneda',
                    type: EdmType.String
                });

                var dateFormatter = DateFormat.getDateInstance({pattern:'dd/MM/yyyy', source: {pattern: "yyyyMMdd"}});

                var that = this;
                this.oDataModel.read("/OCServicioSet", {
                    urlParameters: { "$expand": "HItemsSet,SItemsSet", "$top": 2000, "$skip": 0 },
                    filters: filtersWithStat,
                    success: (data) => {
                        var fecha;

                        data.results.map((unRes)=>{
                            fecha = unRes['Fecha'];
                            if (fecha) {
                                unRes['Fecha'] = dateFormatter.format(dateFormatter.parse(fecha))
                            } else {
                                unRes['Fecha'] = '-'
                            }
                            unRes['Importe'] = that.formatter.numberDots(unRes['Importe'],unRes['Moneda']);
                        })

                        oSettings = {
                            workbook: {
                                columns: aCols,
                                hierarchyLevel: 'Level'
                            },
                            dataSource: data.results,
                            fileName: (status === 'P'?"OrdenesCompra_Servicios.xlsx":"Historial_OrdenesCompra_Servicios.xlsx"),
                        };

                        oSheet = new Spreadsheet(oSettings);
                        oSheet.build().finally(function () {
                            oSheet.destroy();
                        });
                        table.setBusy(false)
                    },
                    error: (e) => {
                        MessageToast.show("Error. " + that.getView().getModel("i18n").getResourceBundle("errorExcel"))
                        table.setBusy(false)
                    }
                })
            },

            onOpenOrdenCompra: function (oEvent) {
                const details = oEvent.getSource().getParent().getBindingContext('ocMaterialesPendientes').getObject();

                // Dispatching the OC's fragment depending on the Sociedad
                const fragmentName =
                    (`${details["Sociedad"]}`).toLowerCase() === 'c024' ? 'c024' :
                    'c001';

                var that = this;
                this.oDataModel.read(`/OrdenesSet('${details.Orden}') `, {
                    success: (data) => {
                        const fecha = data.Fecha
                        data.Fecha = `${fecha.substring(6, 8)}/${fecha.substring(4, 6)}/${fecha.substring(0, 4)}`
                        data.Texto = data.Texto.replaceAll('\\n', '<br>')
                        const jsonData = { 'ordencompra': details, 'ordendata': data };

                        const total = jsonData.ordencompra?.MatPendientesSet?.results?.map( (matPendiente) => {
                            const [ intStr, centsStr ] = matPendiente.Importe.split(',');
                            const ints = parseInt(intStr);
                            // convert the first two digits of the cents to an integer
                            const cents = parseInt(centsStr.substring(0, 2));
                            const total = ints * 100 + cents;
                            return total;
                        }).reduce( (acc, curr) => acc + curr, 0);

                        jsonData.ordencompra.Total = `${total / 100},${String(total % 100).padStart(2, '0')}`;

                        var ordencompra = new JSONModel(jsonData);
                        var oView = this.getView();
                        oView.setModel(ordencompra, "ordencompra");

                        // The oc fragmen is in webapp/view/ocmaterial/ordenesPDF.fragment.xml

                        // check if _pDialogPDF Map doesn't have the `fragmentName` key
                        if (!this._pDialogPDF.has(fragmentName)) {
                            this._pDialogPDF.set(fragmentName, Fragment.load({
                                id: oView.getId() + "PDF",
                                name: `com.cyt.zmmportalproveedoresordenescompras2021111116.view.ocmaterial.${fragmentName}`,
                                controller: this
                            }).then(function (oDialogPDF) {
                                oView.addDependent(oDialogPDF);
                                return oDialogPDF;
                            }));
                        }

                        this._pDialogPDF.get(fragmentName).then(function (oDialogPDF) {
                            oDialogPDF.open();
                        }.bind(this));

                    },
                    error: (e) => { MessageToast.show( that.getView().getModel("i18n").getResourceBundle("tryLater")) }
                })
            },

            onOpenOrdenCompraHistorico: function (oEvent) {
                var details = oEvent.getSource().getParent().getBindingContext('ocMateriales').getObject();

                // Dispatching the OC's fragment depending on the Sociedad
                const fragmentName =
                    (`${details["Sociedad"]}`).toLowerCase() === 'c024' ? 'c024' :
                    'c001';

                var that = this;
                this.oDataModel.read(`/OrdenesSet('${details.Orden}') `, {
                    success: (data) => {
                        var fecha = data.Fecha
                        data.Fecha = `${fecha.substring(6, 8)}/${fecha.substring(4, 6)}/${fecha.substring(0, 4)}`
                        data.Texto = data.Texto.replaceAll('\\n', '<br>')
                        var ordencompra = new JSONModel({ 'ordencompra': details, 'ordendata': data });
                        var oView = this.getView();
                        oView.setModel(ordencompra, "ordencompra");
                        if (!this._pDialogPDF.has(fragmentName)) {
                            this._pDialogPDF.set(fragmentName, Fragment.load({
                                id: oView.getId() + "PDF",
                                name: `com.cyt.zmmportalproveedoresordenescompras2021111116.view.ocmaterial.${fragmentName}`,
                                controller: this
                            }).then(function (oDialogPDF) {
                                oView.addDependent(oDialogPDF);
                                return oDialogPDF;
                            }));
                        }

                        this._pDialogPDF.get(fragmentName).then(function (oDialogPDF) {
                            oDialogPDF.open();
                        }.bind(this));

                    },
                    error: (e) => { MessageToast.show(that.getView().getModel("i18n").getResourceBundle("tryLater")) }
                })
            },

            onOpenOrdenCompraServicePend: function (oEvent) {
                this.onOpenOrdenCompraService(oEvent, 'P');
            },

            onOpenOrdenCompraServiceHist: function (oEvent) {
                this.onOpenOrdenCompraService(oEvent, 'H');
            },

            onOpenOrdenCompraService: function (oEvent, status) {
                var modelName = (status === 'P'?"ocServicios":"ocServiciosHist");
                var details = oEvent.getSource().getParent().getBindingContext(modelName).getObject();

                var that = this;
                this.oDataModel.read(`/OrdenesSet('${details.Orden}') `, {
                    success: (data) => {
                        var ordencompra = new JSONModel({ 'ordencompra': details, 'ordendata': data });
                        var oView = this.getView();
                        oView.setModel(ordencompra, "ordencompra");

                        if (!this._pDialogPDFService) {
                            this._pDialogPDFService = Fragment.load({
                                id: oView.getId() + "PDFServices",
                                name: "com.cyt.zmmportalproveedoresordenescompras2021111116.view.ordenesServicePDF",
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
                    filename: 'Orden de compra '+oModel.getProperty('/ordencompra/Orden')+'.pdf',
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

            onGetMaterialTag: function (oEvent) {

                var data = oEvent.getSource().getParent().getBindingContext('detailsMaterial').getObject()
                var nroOrden = this.getView().getModel('detailsMaterial').getData().nroOrden

                var appBaseUrl = jQuery.sap.getModulePath("com.cyt.zuxportalesbase2021111116");
                var serviceDest = 'ECC_CYT_HTTP_PTALPROV';
                var url = `${appBaseUrl}/proxy/${serviceDest}/sap/opu/odata/sap/ZCL_MM_PORTAL_PRO_SRV/EtiquetasSet(OrdenCompra='${nroOrden}',Posicion='${parseInt(data.Item)}')/$value`

                var that = this;

                var materialCode = data.Material;

                
                that._pDialog.then(function (oDialog) {
                    oDialog.setBusy(true);
                }.bind(this));

                $.ajax({
                    url: url,
                    method: 'GET',
                    datatype: 'text',
                    success: (data) => {
                        var w = window.open(url, '_blank');
                        w.document.title = materialCode;
                        w.addEventListener('load', function(){
                          w.document.title = materialCode;          
                        }, true);

                        that._pDialog.then(function (oDialog) {
                            oDialog.setBusy(false);
                        }.bind(this));
                    },
                    error: (e, textStatus, jqXHR) => {
                        that._pDialog.then(function (oDialog) {
                            oDialog.setBusy(false);
                        }.bind(this));
                        var error = e.responseXML.querySelector("message").innerHTML
                        switch (error) {
                            case 'MATERIAL_TYPE_ERROR':
                                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("materialTypeError"));
                                break;
                            case 'DOCUMENT_NOT_FOUND':
                                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("documentNotFound"));
                                break;
                            case 'CONVERSION_ERROR':
                                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("conversionError"));
                                break;
                            default:
                                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("tryLater"));
                        }
                    }

                })

            },

            handleValueHelp: function(oEvent) {
                var aCols = this.oColModel.getData().cols;
                
                this.getProveedores();
                this._activeInput = oEvent.getSource().getId().split("--")[1]
                var multiInput = this.getView().byId(this._activeInput)

                this._oBasicSearchField = new SearchField({	showSearchButton: false});
                var that = this;
                Fragment.load({
                    name: "com.cyt.zmmportalproveedoresordenescompras2021111116.view.ValueHelpDialogProveedores",
                    controller: this
                }).then(function name(oFragment) {
                    this._oValueHelpDialog = oFragment;
                    this.getView().addDependent(this._oValueHelpDialog);
    
                    this._oValueHelpDialog.setRangeKeyFields([{
                        label: "ID SAP",
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
                        oTable.setModel(that.oColModel, "columns");
    
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

            onValueHelpOkPress: function (oEvent) {
                var aTokens = oEvent.getParameter("tokens");
                var oMultiInput = this.byId(this._activeInput);

                oMultiInput.setTokens(aTokens);
                this._oValueHelpDialog.close();
                oMultiInput.fireTokenUpdate()
            },
    
            onValueHelpCancelPress: function () {
                this._oValueHelpDialog.close();
            },
    
            onValueHelpAfterClose: function () {
                this._oValueHelpDialog.destroy();
            },
    
            onFilterBarSearch: function (evt) {
                
                
                var sValue = this._oBasicSearchField.getValue();

                var that = this;
                clearTimeout(this.delayTimer);
                this.delayTimer = setTimeout(function() {
                    
                    var filterProv = new Filter({
                        filters: [
                            new Filter({path: "Desc_1", operator: FilterOperator.Contains, value1: sValue.toUpperCase()}),
                        ],
                        and: false
                    })
    
                    that.oDataModel.read('/ValueHelpSet', {
                        urlParameters: {"$top":10, "$skip":0},
                        filters: [
                            new Filter({path: "Code", operator: FilterOperator.EQ, value1: 'Proveedor' }),
                            filterProv
                        ],
                        success: (data) => {that.oModel.setProperty('/ProveedorCollection',data.results)},
                        error: (e) => {MessageToast.show("{i18n>error}")}
                    })

                }, 1000);
            },

            _filterTable: function (oFilter) {
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



        });
    });

// vim: set ts=4 sw=4 expandtab sts=4:
