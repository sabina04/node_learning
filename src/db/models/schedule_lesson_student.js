'use strict';
module.exports = (sequelize, DataTypes) => {
  var ScheduleLessonStudent = sequelize.define('ScheduleLessonStudent',
    {
      schedule_lesson_student_id : { 
        type: DataTypes.INTEGER, primaryKey: true
      },
      user_id: {
        type: DataTypes.INTEGER,
      },
    },
    {
      tableName: 'schedule_lesson_students',
      updatedAt: 'modified',
      createdAt: 'created',
      timestamps: true
  },
  );

  ScheduleLessonStudent.associate = function(models){
    ScheduleLessonStudent.belongsTo(models.ScheduleLesson, { as:'ScheduleLesson',foreignKey: 'schedule_lesson_id'} );
  }

return ScheduleLessonStudent;

};

