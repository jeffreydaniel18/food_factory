/**
 * Helper file for MongoDB instance
 */
require('dotenv').config();
var settings = require('../../local.settings.json');
var mongoose = require('mongoose');
var clientConfig = null;
var fetchConfig = null;
var saveConfig = null;
var mongodbConnectionString = process.env.DB_CONNECTION;//process.env["DB_CONNECTION"]; 
//"mongodb+srv://victor-dev:MONGOgss1234@victor-dev-cluster-t0eu4.azure.mongodb.net/victor-dev?authSource=admin&ssl=true";
/*Function to get MongoDB Instance*/
function getMongoDBInstance() {
    return new Promise((resolve, reject) => {

        var url = '';
        var db = '';

        if (mongodbConnectionString != '') {
            try {
                if (clientConfig != null && clientConfig._readyState == 1) {
                    resolve(clientConfig);
                }
                else {
                    mongoose.connect(mongodbConnectionString,
                        function (err, client) {
                            clientConfig = client;
                            if (err) {
                                reject(err);
                            } else {
                                if (clientConfig != undefined) {
                                    resolve(clientConfig);
                                } else {
                                    reject('Unable to get connection');
                                }
                            }
                        });
                }
            } catch (e) {
                reject(e);
            }
        } else {
            reject('Database configuration not found');
        }
    });
}


/**
 * This function is used to fetch config information based on the action code provided
 * @input - action_code,type(Save/Fetch)
 * @output - Configuration json of the provided action code
 * 
 * Execution Steps:
 * 1. Based on the type of input provided the config type is matched
 * 2. Now the config type is provided as a condition to fetch config data
 * 3. Now getActionConfig method is called
 * 4. getActionConfig returns the json config based on action code.
 */
function fetchConfigInformation(action_code, type) {
    return new Promise((resolve, reject) => {
        var ConfigType = '';
        var configuration = "";

        if (type == "fetch") {
            ConfigType = "API_CONFIG";
        } else if (type == "save") {
            ConfigType = "API_CONFIG_SAVE";
        }


        /* if(type == "fetch" && fetchConfig != null && fetchConfig != undefined )
         {
             configuration = getActionConfig(fetchConfig,action_code)
              if (configuration == "") {
                     reject('Configuration not found')
                 } else {
                     return resolve(configuration);
                 }
         }
         
          if(type == "save" && saveConfig != null && saveConfig != undefined )
         {
             configuration = getActionConfig(saveConfig,action_code)
              if (configuration == "") {
                     reject('Configuration not found')
                 } else {
                     return resolve(configuration);
                 }   
         }*/

        var query = getDataFromMongoDB("config", "", { "type": ConfigType }, "", "", "", "", "", "");
        query.then((response) => {
            var configs = [];

            if (response.length > 0) {
                configs = response[0].values;

                if (type == "fetch") {
                    fetchConfig = configs;
                    configuration = getActionConfig(fetchConfig, action_code)
                }

                if (type == "save") {
                    saveConfig = configs;
                    configuration = getActionConfig(saveConfig, action_code)
                }



                if (configuration == "") {
                    reject('Configuration not found')
                } else {
                    return resolve(configuration);
                }

            } else {
                reject('Configuration not found')
            }
        }).catch((error) => {
            reject(error);
        })
    })
}


function FetchStateWorkFlowConfig(screen_code, type) {
    return new Promise((resolve, reject) => {
        var ConfigType = "STATE_WORKFLOW_CONFIG";
        var configuration = "";
        var query = getDataFromMongoDB("config", "", { "type": ConfigType, "screen_code": screen_code }, "", "", "", "", "", "");
        query.then((response) => {
            if (response.length > 0) {
                configuration = response[0].values[type];
                if (configuration == "") {
                    reject('Configuration not found')
                } else {
                    return resolve(configuration);
                }
            } else {
                reject('Configuration not found')
            }
        }).catch((error) => {
            reject(error);
        })
    })
}

/**
 * This function is used to retrieve the json config based on action code provided
 */
function getActionConfig(configArr, action_code) {
    for (var config of configArr) {
        if (config['action_code'] == action_code) {
            return config
        }
    }

    return '';
}



/**
 * This function is used to fetch data from mongodb based on json input rule
 * @input - configuration,data
 * @output - Fetched json data
 * 
 * Execution Steps:
 * 1. Based on the json rule either query condition or query aggregation is formed.
 * 2. Now the condition or aggregation's placeholders will be replaced by the provided input data
 * 3. After that if pagination count/skip count is provided then pagination rule will be formed.
 * 4. If the query needs to fetch only count of records then a parameter getOnlyCount is validated and if so then count will be fetched 
 * 5. Now the formed query is send to getDataFromMongoDB method to fetch data
 * 6. After that the data and count(if needed) will be resolved back
 */
function fetchData(configuration, data) {
    return new Promise((resolve, reject) => {
        var query = "";
        if (data.screen_code && data.action_code) {
            var roleName = (data.role == undefined) ? "DEFAULT" : data.role;
            configuration = configuration[data.action_code]["ROLE_" + roleName];
        }
        var collection_name = configuration['collection_name'];
        var selection = configuration['selection'];
        var condition = configuration['condition'];
        var need_search = data['need_search'] || false;
        var aggregation = (need_search) ? configuration['search_query'] : configuration['aggregate'];
        var getCount = configuration['getCount'] || false;
        var getOnlyCount = configuration['getOnlyCount'] || false;
        var select_only = configuration['select_only'] || '';

        var need_search = data['need_search'] || false;
        var paginationCount = data.PaginationCount || '';
        var page = data.PageNum || '';
        var SortField = data.SortField || '';
        var SortValue = data.SortValue || '';



        var count = 0;

        if (aggregation == "") {
            if (typeof condition != 'string') {
                condition = JSON.stringify(condition);
            }
            var keys = Object.keys(data);
            for (var key of keys) {
                condition = replaceText(condition, key, data[key]);
            }

            condition = JSON.parse(condition);

            if (data.selection != undefined && data.selection != '') {
                selection = data.selection;
            }
        } else {
            var keys = Object.keys(data);
            for (var key of keys) {
                aggregation = replaceText(aggregation, key, data[key]);
            }

            aggregation = replaceText(aggregation, "CURRENT_DATE", getDateTIme)
            //            aggregation = replaceText(aggregation, "SET_DATE", new Date())
        }

        if (paginationCount != '') {
            var skipCount = paginationCount * page;
        }

        if (getOnlyCount) {
            var query = getDataCountFromMongoDB(collection_name, condition);
            query.then((count) => {
                var result = {};
                result['count'] = count;
                resolve(result);
            }).catch((ex) => {
                reject(ex);
            });
        } else {
            var query = getDataFromMongoDB(collection_name, selection, condition, aggregation, SortField, SortValue, skipCount, paginationCount, select_only);
            query.then((response) => {
                if (getCount && condition != {}) {
                    var query = getDataCountFromMongoDB(collection_name, condition, aggregation);
                    query.then((count) => {
                        var result = {};
                        result['count'] = count;
                        result['data'] = response;
                        resolve(result);
                    }).catch((ex) => {
                        reject(ex);
                    });
                }
                else {
                    resolve(response);
                }
                // else {
                //     if (need_search) {
                //         var result = {};
                //         result['count'] = response.length;
                //         result['data'] = response;
                //         resolve(result);
                //     }
                //     else {
                //         resolve(response);
                //     }
                // }
            }).catch((error) => {
                reject(error);
            })
        }
    })
}

/**
 * This function is used to get data from mongodb based on conditions provided
 * 
 * @input - collection name,selection columns,condition,aggregation,sortfield,sortvalue,skipcount,pagination count,select particular columns
 * @output - Fetched json data
 * 
 * Execution steps:
 * 1. The condition or aggregation (formed) will get parsed for query operation
 * 2. If sort field and value is provided then the condition will be applied
 * 3. If skipcount / pagination count is provided then the condition will be applied
 * 4. Now the formed query is executed 
 * 5. If select only is provided then the result will be filtered based on the select only column and it will be send.
 */
function getDataFromMongoDB(collection, selection, condition, aggregation, sortField, sortValue, skipCount, paginationCount, select_only) {
    return new Promise((resolve, reject) => {
        getMongoDBInstance().then((dbConnection) => {
            var query = '';
            if (aggregation == '') {
                query = dbConnection.collection(collection).find(condition);
            } else {
                aggregation = JSON.parse(aggregation)
                var sort = {};
                if (sortField != '') {

                    sort[sortField] = sortValue;
                    aggregation.push({ "$sort": sort });
                    query = dbConnection.collection(collection).aggregate(aggregation);
                } else {
                    query = dbConnection.collection(collection).aggregate(aggregation);
                }

            }
            if (skipCount == '') {
                skipCount = 0;
            }

            if (skipCount != undefined) {
                query = query.skip(skipCount)
            }

            if (paginationCount != '' && paginationCount != undefined) {
                query = query.limit(paginationCount)
            }

            if (aggregation == '') {
                if (sortField != '' && sortField != undefined) {
                    if (typeof sortValue == 'string') {
                        sortValue = 1;
                    } else {
                        sortValue = parseInt(sortValue)
                    }
                    query = query.sort([
                        [sortField, sortValue]
                    ]);
                }
            }

            query.toArray((err, response) => {
                if (err) {
                    reject(err)
                } else {
                    if (selection !== '') {
                        var arr = [];

                        var keys = selection.split(",");
                        for (resp of response) {
                            var obj = {};
                            for (var key of keys) {
                                obj[key] = resp[key];
                            }
                            arr.push(obj);
                        }
                        resolve(arr);
                    } else if (select_only !== '') {
                        var arr = [];
                        for (resp of response) {
                            var obj = {};
                            if (resp[select_only] !== undefined) {
                                obj = resp[select_only];
                                delete obj['_id'];
                                arr.push(obj);
                            }
                        }
                        resolve(arr);
                    }
                    else {
                        for (var dat of response) {
                            delete dat['_id'];
                        }
                        resolve(response);
                    }
                }
            })
        }).catch((error) => {
            reject(error)
        })
    })
}


function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}


function getDataCountFromMongoDB(collection, condition, aggregation) {
    return new Promise((resolve, reject) => {
        if (aggregation != "" && typeof aggregation == "string") {
            aggregation = JSON.parse(aggregation)
        }

        getMongoDBInstance().then((dbConnection) => {
            var query = '';
            if (aggregation != "") {
                dbConnection.collection(collection).aggregate(aggregation).toArray((err, result) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(result.length)
                    }
                });
            }
            else if (typeof condition == "object") {
                query = dbConnection.collection(collection).count(condition, (err, result) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(result)
                    }
                });
            }
            // if (!isEmpty(condition)) {
            //     query = dbConnection.collection(collection).count(condition,(err, result) => {
            //         if (err) {
            //             reject(err)
            //         } else {
            //             resolve(result)
            //         }
            //     });
            // }
            // else {
            //     dbConnection.collection(collection).aggregate(aggregation).toArray((err, result) => {
            //         if (err) {
            //             reject(err)
            //         } else {
            //             resolve(result.length)
            //         }
            //     });
            // }
        }).catch((error) => {
            reject(error)
        })
    })
}

/*
Function used to save based on condition of single/multiple condition.
 */
function UpsertData(ruleSchema, UpdateData, Operation = "SAVE", action_code = "", screen_code = "") {
    return new Promise((resolve, reject) => {
        if (screen_code != "") {
            ruleSchema = ruleSchema[action_code]
            ruleSchema.condition = ruleSchema.ui_data_updates.condition
        }
        var condition = ruleSchema.condition;
        var CollectionName = ruleSchema.collection_name;
        var SuccessMessage = ruleSchema.success_message;
        var UpdateMessage = ruleSchema.update_message;
        var FailureMessage = ruleSchema.failure_message;

        if (typeof condition != 'string') {
            condition = JSON.stringify(condition);
        }
        var keys = Object.keys(UpdateData);
        for (var key of keys) {
            var temp = '';
            temp = replaceText(condition, key, UpdateData[key]);
            if (temp != "") {
                condition = temp;
            }
        }

        condition = JSON.parse(condition);
        var ConditionObj = condition;

        var process_description = ruleSchema.process_description || ""

        if (process_description != "") {
            UpdateData["process_description"] = process_description
        }



        if (ruleSchema.array_action != undefined && (ruleSchema.array_action == "insert" || ruleSchema.array_action == "update" || ruleSchema.array_action == "delete")) {
            delete UpdateData.Id;
            delete UpdateData.CaseId;
        }
        if (ruleSchema.array_action != undefined && ruleSchema.array_action == "insert") {
            var auditInfo = UpdateData.AuditInfo || "";
            delete UpdateData["AuditInfo"];
            delete UpdateData["process_description"];

            // var keys = Object.keys(UpdateData);

            // if(auditInfo != ""){
            //     if(UpdateData['process_description']){
            //         auditInfo["process_description"] = UpdateData['process_description'];
            //     }

            //     for(var key of keys){
            //         if(key !== "AuditInfo"){
            //             UpdateData[key]['AuditInfo'] = auditInfo;
            //         }
            //     }
            // }

            var UpdateSchema = {
                $addToSet: UpdateData,
                $set: { "AuditInfo": auditInfo }
            }

        } else if (ruleSchema.array_action != undefined && ruleSchema.array_action == "delete") {
            var auditInfo = UpdateData.AuditInfo || "";
            delete UpdateData["AuditInfo"];
            delete UpdateData["process_description"];

            var UpdateSchema = {
                $pull: UpdateData,
                $set: { "AuditInfo": auditInfo }
            }
        } else {
            var UpdateSchema = {
                $set: UpdateData
            }
        }
        getMongoDBInstance().then((dbConnection) => {
            dbConnection.collection(CollectionName).update(ConditionObj, UpdateSchema, {
                upsert: true,
                overwrite: false
            }, (err, result) => {
                if (err) {
                    reject(FailureMessage);
                } else {
                    if (ruleSchema.other_column_updates != undefined && ruleSchema.other_column_updates.length > 0) {
                        var bulk = dbConnection.collection("cases").initializeUnorderedBulkOp();
                        ruleSchema.other_column_updates.forEach(element => {
                            var QueryCondition = JSON.stringify(element.condition);
                            var keys = Object.keys(UpdateData);
                            for (var key of keys) {
                                var temp = '';
                                temp = replaceText(QueryCondition, key, UpdateData[key]);
                                if (temp != "") {
                                    QueryCondition = temp;
                                }
                            }
                            var QueryValue = element.value;
                            if (QueryValue.ProcessStartDate != undefined && QueryValue.ProcessStartDate == "") {
                                QueryValue.ProcessStartDate = new Date();
                            }
                            QueryCondition = JSON.parse(QueryCondition);
                            bulk.find(QueryCondition).updateOne({ $set: QueryValue });
                        });
                        bulk.execute();
                    }
                    if (ruleSchema.other_data_updates != undefined && ruleSchema.other_data_updates.length > 0) {
                        var bulk = dbConnection.collection("cases").initializeUnorderedBulkOp();
                        ruleSchema.other_data_updates.forEach(element => {
                            var QueryCondition = JSON.stringify(element.condition);
                            var keys = Object.keys(UpdateData);
                            for (var key of keys) {
                                var temp = '';
                                temp = replaceText(QueryCondition, key, UpdateData[key]);
                                if (temp != "") {
                                    QueryCondition = temp;
                                }
                            }
                            var QueryValue = element.value;
                            if (QueryValue.ProcessStartDate != undefined && QueryValue.ProcessStartDate == "") {
                                QueryValue.ProcessStartDate = new Date();
                            }
                            QueryCondition = JSON.parse(QueryCondition);
                            bulk.find(QueryCondition).updateOne({ $set: QueryValue });
                        });
                        bulk.execute();
                    }
                    if (action_code == "ACT2039") {
                        SetReductionTabStatus(UpdateData, action_code).then((result) => {
                            var Msg = (Operation == "SAVE") ? SuccessMessage : UpdateMessage;
                            resolve(Msg);
                        }).catch((err) => {
                            reject(FailureMessage);
                        })
                    }
                    else if (action_code == "ACT2012" && UpdateData["Operation"] == undefined) {
                        CreateHospitalCounter(UpdateData["HospitalId"]).then((result) => {
                            var Msg = (Operation == "SAVE") ? SuccessMessage : UpdateMessage;
                            resolve(Msg);
                        }).catch((err) => {
                            reject(FailureMessage);
                        })
                    }
                    else {
                        var Msg = (Operation == "SAVE") ? SuccessMessage : UpdateMessage;
                        resolve(Msg);
                    }
                }
            })
        }).catch((error) => {
            reject(error)
        })
    });
}

/*
Function used to save based on multiple condition to a single field based on "OR" condition
 */
function MultipleUpsertToSingleField(ruleSchema, UpdateData, action_code = "", screen_code = "") {
    if (screen_code != "") {
        ruleSchema = ruleSchema[action_code]
        //ruleSchema.condition = ruleSchema.ui_data_updates.condition
    }
    var condition = UpdateData.condition;
    var CollectionName = ruleSchema.collection_name;

    var SuccessMessage = ruleSchema.success_message;
    var FailureMessage = ruleSchema.failure_message;
    var ConditionObj = {
        $or: condition
    };
    if (ruleSchema.unset != undefined && ruleSchema.unset == true) {
        var UpdateSchema = {
            $unset: UpdateData.updateValues
        }
    } else {
        var UpdateSchema = {
            $set: UpdateData.updateValues
        }
    }

    return new Promise((resolve, reject) => {
        getMongoDBInstance().then((dbConnection) => {
            dbConnection.collection(CollectionName).updateMany(ConditionObj, UpdateSchema, {
                upsert: true,
                overwrite: false
            }, (err, result) => {
                if (err) {
                    reject(FailureMessage);
                } else {
                    resolve(SuccessMessage);
                }
            })
        }).catch((error) => {
            reject(error)
        })
    });
}


function InsertMany(ruleSchema, DocumentList, action_code = "", screen_code = "") {
    if (screen_code != "") {
        ruleSchema = ruleSchema[action_code]
        //ruleSchema.condition = ruleSchema.ui_data_updates.condition
    }
    var CollectionName = ruleSchema.collection_name;
    var SuccessMessage = ruleSchema.success_message;
    var FailureMessage = ruleSchema.failure_message;
    var insertData = DocumentList.InsertData;
    return new Promise((resolve, reject) => {
        getMongoDBInstance().then((dbConnection) => {
            dbConnection.collection(CollectionName).insertMany(insertData, (err, result) => {
                if (err) {
                    reject(FailureMessage);
                } else {
                    resolve(SuccessMessage);
                }
            })
        }).catch((err) => {
            reject("ERROR");
        });
    })
}


function RemoveDocuments(CollectionName, Condition) {
    return new Promise((resolve, reject) => {
        getMongoDBInstance().then((dbConnection) => {
            dbConnection.collection(CollectionName).remove(Condition, (err, result) => {
                if (err) {
                    reject("ERROR");
                } else {
                    resolve(result);
                }
            })
        }).catch((err) => {
            reject("ERROR");
        });
    })
}

function SimpleFindMongoDB(CollectionName, ConditionObj, UpdateData) {
    return new Promise((resolve, reject) => {
        getMongoDBInstance().then((dbConnection) => {
            dbConnection.collection(CollectionName).find(ConditionObj).toArray((err, result) => {
                if (err) {
                    reject("ERROR");
                } else {
                    resolve(result);
                }
            })
        }).catch((err) => {
            reject("ERROR");
        });
    });
}

function SaveIntoMongoDB(CollectionName, ConditionObj, UpdateData) {
    return new Promise((resolve, reject) => {
        getMongoDBInstance().then((dbConnection) => {
            dbConnection.collection(CollectionName).updateOne(ConditionObj, { $set: UpdateData }, {
                upsert: true,
                overwrite: false
            }, (err, result) => {
                if (err) {
                    reject("ERROR");
                } else {
                    resolve("SUCCESS");
                }
            })
        }).catch((err) => {
            reject("ERROR");
        });
    });
}

function CloseMongDB(mongoose) {
    mongoose.close();
}


function CloseMongDB(mongoose) {
    mongoose.close();
}

function GetOrderFromCases(data) {
    return new Promise((resolve, reject) => {

        var CaseId = data.CaseId;
        var query = getDataFromMongoDB("cases", "ReductionRequestOrder", { "CaseId": CaseId }, "", "", "", "", "", "");
        query.then((response) => {
            if (response.length > 0) {
                var result = response[0];
                if (result["ReductionRequestOrder"]) {
                    var order = result["ReductionRequestOrder"];
                    resolve(order);
                }
                else {
                    var order = 0;
                    resolve(order);
                }
            }
        });
        //ReductionRequestOrder

    });
}
var screenOrder = {
    ReduceRequest: 1,
    CategoriesOfDisagreement: 2,
    OtherMedicalLien: 3,
    TreatmentTypes: 4,
    LostWage: 5,
    TotalSpecialDamage: 6,
    ProposedSettlementAmount: 7,
    AttorneyFees: 8,
    NonMedicalLien: 9
}
function SetStatus(params, action_code, order, fieldName) {
    return new Promise((resolve, reject) => {

        var objectName = undefined;
        var keys = Object.keys(params);
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] != "CaseId") {
                objectName = keys[i];
                break;
            }
        }
        if (objectName != undefined) {
            var OrderNumber = screenOrder[objectName];
            //Higger order,Save the status in cases document
            if (OrderNumber > order) {
                var ConditionObj = { CaseId: params.CaseId };
                var UpdateData = {};
                UpdateData[fieldName] = OrderNumber;
                SaveIntoMongoDB('cases', ConditionObj, UpdateData).then((result) => {
                    return resolve(result);
                }).catch((err) => {
                    return reject("ERROR");
                })
            } else {
                return resolve("SUCCESS");
            }
        }
    });
}

function SetReductionTabStatus(data, action_code) {
    return new Promise((resolve, reject) => {
        var params = data;
        GetOrderFromCases(params).then((result) => {
            SetStatus(params, action_code, result, "ReductionRequestOrder").then((reuslt) => {
                resolve(result);
            })
        }).catch((err) => {
            reject('ERROR in SetReductionTabStatus');
        })
    });

}

function CreateHospitalCounter(HospitalId) {
    return new Promise((resolve, reject) => {
        getMongoDBInstance().then((dbConnection) => {
            dbConnection.collection("counter").findOne({ key: HospitalId }, (err, doc) => {
                if (err) {
                    reject('FAILURE');
                }
                else {
                    if (doc == null) {
                        var condition = { key: HospitalId };
                        var UpdateData = { key: HospitalId, count: 0 };
                        //SaveIntoMongoDB(CollectionName, ConditionObj, UpdateData)
                        SaveIntoMongoDB('counter', condition, UpdateData).then((result) => {
                            return resolve(result);
                        }).catch((err) => {
                            return reject("ERROR");
                        });
                    }
                    else {
                        resolve('SUCCESS');
                    }
                }
            });
        }).catch((err) => {
            return reject("ERROR");
        });
    });
}



function getDateTIme() {
    var date = new Date();

    return date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

function replaceText(originalText, findText, replacementText) {
    try {
        return originalText.replace(new RegExp("{" + findText + "}", 'g'), replacementText);
    } catch (e) {
        return "";
    }
}

module.exports = {
    getMongoDBInstance: getMongoDBInstance,
    CloseMongDB: CloseMongDB,
    SimpleFindMongoDB: SimpleFindMongoDB,
    UpsertData: UpsertData,
    MultipleUpsertToSingleField: MultipleUpsertToSingleField,
    FetchConfigInformation: fetchConfigInformation,
    FetchStateWorkFlowConfig: FetchStateWorkFlowConfig,
    FetchData: fetchData,
    SaveIntoMongoDB: SaveIntoMongoDB,
    InsertMany: InsertMany
}
