'use strict';
module.exports = (sequelize, DataTypes) => {
  var CrmStudentContract = sequelize.define('crm_student_contract',
    {
      student_contract_id : { 
        type: DataTypes.INTEGER, primaryKey: true
      },
    },
    {
      tableName: 'crm_student_contracts',

      updatedAt: 'modified',
      createdAt: 'created',
      timestamps: true
  },
  );

return CrmStudentContract;

};

