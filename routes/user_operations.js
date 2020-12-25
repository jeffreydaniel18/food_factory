/*
Created by: Jeffrey Daniel Raja V
Purpose: To help in user registeration / update user details / user deactivation
Created on: 25-12-2020
*/
var crypto = require('crypto');
var instanceHelper = require('../util/instances/mongoInstance');
var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');

router.post('/', function (req, res) {
    var dbConnection = "";
    var errorMessage = 'Unexpected error has occured.Please contact adminstrator.';
    var sucessMessage = "";


    return getDBConfig().
        then((response) => execute(response))
        .then((response) => SendSuccessResponse("", response))
        .catch((error) => SendErrorResponse(error));

    function getDBConfig(requestData) {
        return new Promise((resolve, reject) => {
            instanceHelper.getMongoDBInstance().then((dbConn) => {
                dbConnection = dbConn;
                resolve("");
            }).catch((ex) => {
                reject(ex);
            });
        });
    }

    function execute() {
        return new Promise((resolve, reject) => {

            try {
                var register_obj = {};
                var update_obj = {};
                var params = req.body.data;
                if (params.process == "Register") {
                    var salt = crypto.randomBytes(16).toString('hex');
                    var hashPassword = crypto.pbkdf2Sync(params.Password, salt, 1000, 16, `sha512`).toString(`hex`);
                    var Id = uuidv4();
                    register_obj["Id"] = Id;
                    register_obj["UserName"] = params.UserName;
                    register_obj["Password"] = hashPassword;
                    register_obj["Salt"] = salt;
                    register_obj["Role"] = params.Role;
                    register_obj["EmailId"] = params.EmailId;
                    register_obj["Status"] = "Active";
                    register_obj["AuditInfo"] = params.AuditInfo;
                    register_obj["FirstName"] = params.FirstName;
                    register_obj["MiddleName"] = params.MiddleName;
                    register_obj["LastName"] = params.LastName;
                    register_obj["Telephone"] = params.Telephone;
                    dbConnection.collection("users").insert(register_obj, (err, res) => {

                        if (err) {
                            reject(err);
                        } else {
                            sucessMessage = "User registered successfully";
                            resolve("");
                        }
                    });
                }
                else if (params.process == "Update") {
                    update_obj["UserName"] = params.UserName;
                    update_obj["Role"] = params.Role;
                    update_obj["EmailId"] = params.EmailId;
                    update_obj["Status"] = "Active";
                    update_obj["AuditInfo"] = params.AuditInfo;
                    update_obj["FirstName"] = params.FirstName;
                    update_obj["MiddleName"] = params.MiddleName;
                    update_obj["LastName"] = params.LastName;
                    update_obj["Telephone"] = params.TelephoneDirect;
                    dbConnection.collection("users").update({
                        "Id": params.Id
                    }, {
                        "$set": update_obj
                    }, {
                        upsert: true
                    }, (err, resp) => {
                        if (err) {
                            reject(err);
                        } else {
                            sucessMessage = "User updated successfully";
                            resolve("");
                        }
                    });
                }
                else if (params.process == "Delete") {
                    dbConnection.collection("users").update({
                        "Id": params.Id
                    }, {
                        "$set": {
                            "Status": "InActive"
                        }
                    }, {
                        upsert: true
                    }, (err, resp) => {
                        if (err) {
                            reject(err);
                        } else {
                            sucessMessage = "User deleted successfully";
                            resolve("");
                        }
                    });
                }
                else {

                }
            } catch (ex) {
                console.log("Exception Occured");
                reject(errorMessage);

            }
        });
    }

    //Send success response.
    function SendSuccessResponse(message, responseObject) {
        // SetResult("SUCCESS", sucessMessage, responseObject);
        var result = {}
        result.status = "SUCCESS";
        result.message = sucessMessage;
        result.data = responseObject;
        res.send(result);
    }
    //Send error response.
    function SendErrorResponse(errorMessage) {
        //SetResult("FAILURE", errorMessage, {});
        var result = {}
        result.status = "FAILURE";
        result.message = errorMessage;
        result.data = {};
        res.send(result);
    }
});
module.exports = router;