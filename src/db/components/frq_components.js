var models = require('../models');
var async = require('async');
module.exports = {
    getFrq: function (student_contract_id, cb) {
        const self = this;
        async.parallel({
            pacedContractDetail: function (callback) {
                self.getPacedContractLessons(student_contract_id, function (data1) {
                    callback(null, data1);
                });
            },
            studentContractDetail: function (callback) {
                self.getStudentContractDetail(student_contract_id, function(cd){
                    callback(null, cd);
                });
            }
        }, function (err, results) {
            console.log("in component",results.studentContractDetail);
            cb(results.one);
        });
    },
    getPacedContractLessons: function (student_contract_id, cb) {
        return models.CrmStudentActivityLog.sum('unit_transacted',
            {
                where: {
                    student_contract_id : student_contract_id
                    ,activity_type : 'CPD'
                }
            }).then(data => {
                cb(data);
            });
    },
    getStudentContractDetail : function(student_contract_id, cb){
        return models.CrmStudentContract.findAll({
            where : {
                student_contract_id : student_contract_id
            }
        }).then(data=>{
            cb(data);
        });
    }
};