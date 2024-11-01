/*global QUnit*/

sap.ui.define([
	"comcyt./zmm_portalproveedores_ordenescompras_2021111116/controller/Master.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Master Controller");

	QUnit.test("I should test the Master controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
