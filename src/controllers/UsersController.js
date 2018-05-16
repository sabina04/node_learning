var models = require('../db/models');
const express = require('express'),
token = require('../auth/token'),
app = express(),
mailer = require('express-mailer');
var conf = require('../../config');  
var commonComponent = require('../db/components/common_component');
var scheduleLessonStudentComponent = require('../db/components/schedule_lesson_student_component');
module.exports = {
    name: 'users',
    post: {
        login : function(req, res, next){
            var username = req.body.username;
            var password = req.body.password;
            password = commonComponent.hashPassword(password);
            models.user.findOne({
                where: {
                    username:username,
                    password:password
                },
                include:{
                    model: models.crm_prospect, as: 'CrmProspect' 
                }
            }).then(function(data){
                if(data != null){
                    var tokenJsonData = {"username":data.username,'user_id':data.user_id,'type':data.type};
                    data.dataValues.token = token.generateToken(tokenJsonData);
                    res.rest.success({
                        'data':data,
                        'message':'User login successfuly'
                    });
                } else {
                    res.rest.serverError({
                        'data':{},
                        'message':'Invalid username or password'
                    });
                }
            }); 
        },
        forgotPassword : function(req, res, next){
            var result = req.body;
            var username = result.username;
            models.user.findAll({
            where: {
                username : username
            },
            include:{
                model: models.crm_prospect, as: 'CrmProspect' 
            }
            }).then(function(data) {
        
            if(data != "") { 
                // create unique token
                var dt = data[0];
                ps = Math.random().toString(36).substring(7);
                var password = commonComponent.hashPassword(ps);
                dt.updateAttributes({
                password: password
                })
                .then(function (responseData) {
                    res.mailer.send('email/forgotpassword', {
                        to: 'prateek.jadhav@a3logics.in', 
                        subject: 'Updated Login Password.', 
                        password : ps,
                        username : username,
                      }, function (err) {
                        if (err) {
                          // handle error 
                          console.log(err);
                          console.log('There was an error sending the email');
                          return;
                        }
                        console.log('Email Sent');
                      });
                    res.rest.success({
                        'data':{},
                        'message':'Password sent to your registerd email address'
                    });
                }); 
            } else {
                res.rest.serverError({
                    'data':{},
                    'message':'Invalid username'
                });
            }
            });
        },
        
        findUser : function(req, res, next){
            var username = req.body.username;
            models.user.findOne({
                where: {
                   username : username,
                },
                include:{
                    model: models.crm_prospect, as: 'CrmProspect' 
                }
              }).then(function(data){
                  if(data != null) {
                    res.rest.success(data);
                  } else {
                    res.rest.serverError({
                        'data':{},
                        'message':'Invalid username'
                    });
                  }
              })
        },

        editUsername : function(req, res, next) {
            var userId = req.body.user_id;
            var username = req.body.username;
            models.user.findOne({
                where :  { user_id : userId},
            }).then(function(userData){
                if(userData != "") {
                    if(typeof username !== "undefined") {
                        var curTime = Date.now();
                        var hashToken = curTime + userData.username;
                        emailToken = commonComponent.hashPassword(hashToken);
                        models.crm_prospect.findOne({
                            where :  { user_id : userId},
                        }).then(function(crmProspectData) {
                            userData.updateAttributes({
                                verif_login_email : username,
                                verif_login_token : emailToken,
                            }).then(function(responseText){
                                if(crmProspectData.confirm_email != "") {
                                    var mailSendTo = [crmProspectData.email_one,crmProspectData.confirm_email]
                                } else {
                                    var mailSendTo = crmProspectData.email_one;
                                }
                                res.mailer.send('emailTemplates/username', {
                                    to: mailSendTo, 
                                    subject: emailToken,
                                    emailToken : emailToken
                                  }, function (err) {
                                    if (err) {
                                      // handle error 
                                      res.send('There was an error sending the email');
                                      return;
                                    } else {
                                        res.rest.success("Email has been sent to your mail id please verify from there");
                                    }
                                    
                                  });
                            });
                        })
                        
                    } else {
                        res.rest.success("Please provide username");
                    }                  
                }
            });
        },

        verifyUsername : function(req, res, next) {
          var verificationToken = req.body.token;
          var dateObj = conf.momentDate();
          
            //console.log(mo.format('D') + mo.format('M') + mo.format('Y'));
            if(verificationToken == "") {
                req.res.serverError("Please provide verification value")
            }
            models.user.findOne({
                where : {verif_login_token : verificationToken}
            }).then(function(userData) {
                if(userData != "" && userData != null) {
                    var diffDays = "";
                    if(userData.previous_username_updated != "" || userData.previous_username_updated != null) {
                        var dateObj2 = conf.momentDate(userData.previous_username_updated,"YYYY-MM-DD");
                        diffDays = dateObj.diff(dateObj2, 'days');
                        newPreviousDate = dateObj.format("YYYY-MM-DD");
                    }
                    if(diffDays >= 90 || diffDays === "") {
                        var updateValue = {
                        username : userData.verif_login_email,
                        verif_login_email : null,
                        verif_login_token : null,
                        previous_username : userData.username,
                        previous_username_updated :  newPreviousDate}
                    } else {
                        var updateValue = {
                            username : userData.verif_login_email,
                            verif_login_email : null,
                            verif_login_token : null,
                        }
                    }
                    userData.updateAttributes(
                        updateValue           
                    ).then(function(userData){
                        res.rest.success("Username has been updated succeefully");
                    })
                  //  if(userData.previous_username_update < )
                    
                } else {
                    req.res.serverError("Verification code is not correct.Please try to update the username again.");
                 }
             });
        },

        editEmailOne : function(req, res, next) {
            var crm_prospect = models.crm_prospect.build(req.body);
            var userId = req.body.user_id;
            var email_one = req.body.email_one;
            var er = [];
            errors = crm_prospect.validate().catch(function(err){
                const errors = err.errors.map(function (e) {
                    return e.message;
                });
                if(errors != ''){
                    res.rest.success(JSON.stringify(errors));
                }
            });

            /***** Checking Uniue Email *******/
            models.crm_prospect.findOne({
                    where :  { email_one : email_one},
            }).then(function(data){ 
                if(data != null) {
                    res.rest.success("Email already Exist");
                } else {
                    models.user.findOne({
                        where :  { user_id : userId},
                    }).then(function(data){
                        if(data != "") {
                            if(typeof email_one !== "undefined") {
                                var curTime = Date.now();
                                var hashToken = curTime + email_one;
                                emailToken = commonComponent.hashPassword(hashToken);
                                data.updateAttributes({
                                    verification_email : email_one,
                                    email_token : emailToken,
                                    email_one_expire_time : curTime,
                                }).then(function(responseText){
                                    res.mailer.send('emailTemplates/emailone', {
                                        to: email_one, 
                                        subject: emailToken,
                                        emailToken : emailToken
                                      }, function (err) {
                                        if (err) {
                                          // handle error 
                                          res.send('There was an error sending the email');
                                          return;
                                        } else {
                                            res.rest.success("Email has been sent to your mail id please verify from there");
                                        }
                                        
                                      });
                                    
                                });
                            } else {
                                res.rest.success("Please provide Email One");
                            }
                        } else {
                            res.rest.serverError("Please provide valid details for a user");
                        }
                    });
                }
            });
        },

        verifyEmailOne : function(req,res,next) {
            var verificationToken = req.body.token;
            var dateObj = conf.momentDate();
            if(verificationToken == "") {
                req.res.serverError("Please provide verification value")
            }
            models.user.findOne({
                where : {email_token : verificationToken}
            }).then(function(userData) {
                if(userData != "" && userData != null) {
                    models.crm_prospect.findOne({
                        where: {user_id : userData.user_id}
                    }).then(function(crmProspectData){
                        var diffDays = "";
                        if(crmProspectData.previous_email_one_updated != "" || crmProspectData.previous_email_one_updated != null) {
                            var dateObj2 = conf.momentDate(crmProspectData.previous_email_one_updated,"YYYY-MM-DD");
                            diffDays = dateObj.diff(dateObj2, 'days');
                            newPreviousDate = dateObj.format("YYYY-MM-DD");
                        }
                        if(diffDays >= 90 || diffDays === "") {
                            var updateValue = {
                                email_one : userData.verification_email,
                                previous_email_one : crmProspectData.email_one,
                                previous_email_one_updated :  newPreviousDate
                            }
                        } else {
                            var updateValue = {
                                email_one : userData.verification_email,
                            }
                        }
                        crmProspectData.updateAttributes(
                            updateValue           
                        ).then(function(crmProspectData){
                            userData.updateAttributes({
                                verification_email : null,
                                email_token : null                            
                            })
                            res.rest.success("Email One has been updated succeefully")
                        })
                    })
                } else {
                    req.res.serverError("Data not found.");
                }
            });
        },

        editEmailTwo : function(req, res, next) {
            var crm_prospect = models.crm_prospect.build(req.body);
            var userId = req.body.user_id;
            var confirm_email = req.body.confirm_email;
            var er = [];
            errors = crm_prospect.validate().catch(function(err){
                const errors = err.errors.map(function (e) {
                    return e.message;
                });
                if(errors != ''){
                    res.rest.success(JSON.stringify(errors));
                }
            });

            /***** Checking Uniue Email *******/
            models.crm_prospect.findOne({
                    where :  { user_id : userId},
            }).then(function(crmProspectData){
                if(crmProspectData.confirm_email == confirm_email) {
                    res.rest.success("Email already Exist");
                } else {
                    models.user.findOne({
                        where :  { user_id : userId},
                    }).then(function(userData) {
                        if(userData != "") {
                            if(typeof confirm_email !== "undefined") {
                                var curTime = Date.now();
                                var hashToken = curTime + confirm_email;
                                emailToken = commonComponent.hashPassword(hashToken);
                                userData.updateAttributes({
                                    verification_username : confirm_email,
                                    token : emailToken,
                                    email_expire_time : curTime
                                }).then(function(responseText){
                                    res.mailer.send('emailTemplates/email_two', {
                                        to: confirm_email, 
                                        subject: emailToken,
                                        emailToken : emailToken
                                    }, function (err) {
                                        if (err) {
                                        // handle error 
                                        res.send('There was an error sending the email');
                                        return;
                                        } else {
                                            res.rest.success("Email has been sent to your mail id please verify from there");
                                        }                                        
                                    });                                    
                                });
                            } else {
                                res.rest.success("Please provide Email Two");
                            }
                        } else {
                            res.rest.serverError("Please provide valid details for a user");
                        }
                    });
                }
            });
        },

        verifyEmailTwo : function(req,res,next) {
            var verificationToken = req.body.token;
            var dateObj = conf.momentDate();
            if(verificationToken == "") {
                req.res.serverError("Please provide verification value")
            }
            models.user.findOne({
                where : {token : verificationToken}
            }).then(function(userData) {
                if(userData != "") {
                    models.crm_prospect.findOne({
                        where: {user_id : userData.user_id}
                    }).then(function(crmProspectData){
                        var diffDays = "";
                        if(crmProspectData.previous_confirm_email_updated != "" || crmProspectData.previous_confirm_email_updated != null) {
                            var dateObj2 = conf.momentDate(crmProspectData.previous_confirm_email_updated,"YYYY-MM-DD");
                            diffDays = dateObj.diff(dateObj2, 'days');
                            newPreviousDate = dateObj.format("YYYY-MM-DD");
                        }
                        if(diffDays >= 90 || diffDays === "") {
                            var updateValue = {
                                confirm_email : userData.verification_username,
                                previous_confirm_email : crmProspectData.confirm_email,
                                previous_confirm_email_updated :  newPreviousDate
                            }
                        } else {
                            var updateValue = {
                                confirm_email : userData.verification_username,
                            }
                        }
                        crmProspectData.updateAttributes(
                            updateValue           
                        ).then(function(crmProspectData){
                        userData.updateAttributes({
                            verification_username : null,
                            token : null,
                            verified_username : "yes"
                        })
                        res.rest.success("Email One has been updated succeefully")
                        })
                    })
                }
            });
        },

        editCellEmail : function(req, res, next) {
            var crm_prospect = models.crm_prospect.build(req.body);
            var userId = req.body.user_id;
            var cell_email = req.body.email_two;
            var er = [];
            errors = crm_prospect.validate().catch(function(err){
                const errors = err.errors.map(function (e) {
                    return e.message;
                });
                if(errors != ''){
                    res.rest.success(JSON.stringify(errors));
                }
            });

            /***** Checking Uniue Email *******/
            models.crm_prospect.findOne({
                    where :  { user_id : userId},
            }).then(function(crmProspectData){
                if(crmProspectData.email_two != "" && crmProspectData.email_two == cell_email) {
                    res.rest.success("Email already Exist");
                } else {
                    models.user.findOne({
                        where :  { user_id : userId},
                    }).then(function(userData){
                        if(userData != "") {
                            if(typeof cell_email !== "undefined") {
                                var curTime = Date.now();
                                var hashToken = curTime + cell_email;
                                emailToken = commonComponent.hashPassword(hashToken);
                                userData.updateAttributes({
                                    verification_cell_email : cell_email,
                                    verification_cell_token : emailToken,
                                }).then(function(responseText){
                                    res.mailer.send('emailTemplates/cell_email', {
                                        to: cell_email, 
                                        subject: emailToken,
                                        emailToken : emailToken
                                    }, function (err) {
                                        if (err) {
                                        // handle error 
                                        res.send('There was an error sending the email');
                                        return;
                                        } else {
                                            res.rest.success("Email has been sent to your mail id please verify from there");
                                        }                                        
                                    });                                    
                                });
                            } else {
                                res.rest.success("Please provide Email Two");
                            }
                        } else {
                            res.rest.serverError("Please provide valid details for a user");
                        }
                    });
                }
            });
        },

        verifyCellEmail : function(req,res,next) {
            var verificationToken = req.body.token;
            var dateObj = conf.momentDate();
            if(verificationToken == "") {
                req.res.serverError("Please provide verification value")
            }
            models.user.findOne({
                where : {verification_cell_token : verificationToken}
            }).then(function(userData) {
                if(userData != "") {
                    models.crm_prospect.findOne({
                        where: {user_id : userData.user_id}
                    }).then(function(crmProspectData){
                        var diffDays = "";
                        if(crmProspectData.previous_email_two_updated != "" || crmProspectData.previous_email_two_updated != null) {
                            var dateObj2 = conf.momentDate(crmProspectData.previous_email_two_updated,"YYYY-MM-DD");
                            diffDays = dateObj.diff(dateObj2, 'days');
                            newPreviousDate = dateObj.format("YYYY-MM-DD");
                        }
                        if(diffDays >= 90 || diffDays === "") {
                            var updateValue = {
                                email_two : userData.verification_cell_email,
                                previous_email_two : crmProspectData.confirm_email,
                                previous_email_two_updated :  newPreviousDate
                            }
                        } else {
                            var updateValue = {
                                confirm_email : userData.verification_cell_email,
                            }
                        }
                        crmProspectData.updateAttributes(
                            updateValue           
                        ).then(function(crmProspectData) {
                            userData.updateAttributes({
                                verification_cell_email : null,
                                verification_cell_token : null,
                            })
                            res.rest.success("Email One has been updated succeefully")
                        })
                    })
                }
            });
        },

        editStudentProfile : function(req, res, next) {
            var userId = req.body.user_id,
            occupation = req.body.occupation,
            jobDetails = req.body.job_details,
            hobbies = req.body.hobbies,
            dreamgoals = req.body.dreamgoals,
            website = req.body.website,
            language = req.body.language,
            jpTeacher = req.body.jp_teacher,
            home_post_code = req.body.home_post_code,
            home_prefecture_id = req.body.home_prefecture_id,
            home_city = req.body.home_city,
            home_address_one = req.body.home_address_line_one,
            home_address_two = req.body.home_address_line_two,
            lessonReminderEmail = req.body.lesson_reminder_email;
            models.crm_prospect.findOne({
                where : {user_id : userId}
            }).then(function(studentData) {
                if(studentData != "") {
                    studentData.updateAttributes({
                        job_details : jobDetails,
                        hobbies : hobbies,
                        dream_goals : dreamgoals,
                        website : website,
                        language : language,
                        jp_teacher : jpTeacher,
                        occupation : occupation,
                        lesson_reminder_email : lessonReminderEmail
                    }).then(function(studentData){
                        var dateObj = conf.momentDate();
                        newPreviousDate = dateObj.format("YYYY-MM-DD");
                        models.CrmProspectAddress.findOne({
                            where : {user_id : userId}
                        }).then(function(studentAddressData) {
                            updatedAddress = {home_post_code : home_post_code,
                                home_prefecture_id : home_prefecture_id,
                                home_city_id : home_city,
                                home_address_line_one : home_address_one,
                                home_address_line_two : home_address_two};
                            var previous_home_post_code = studentAddressData.previous_home_post_code,
                            previous_home_city = studentAddressData.previous_home_city_id,
                            previous_home_address_one = studentAddressData.previous_home_address_line_one,
                            previous_home_address_two = studentAddressData.previous_home_address_line_two,
                            previous_home_prefecture = studentAddressData.previous_home_prefecture_id;
                            if(home_post_code != "" || home_post_code != "undefined") {
                                console.log(previous_home_post_code +"---" + previous_home_city);
                                if(previous_home_post_code == null || previous_home_post_code == "") {
                                    console.log("if");
                                    var previous_home_post_code = '{"home_post_code" : "' + home_post_code +'", "updated_date" : "'+ newPreviousDate+'"}';
                                    updatedAddress.previous_home_post_code = previous_home_post_code;
                                } else {
                                    updatedDate = JSON.parse(studentAddressData.previous_home_post_code);
                                    updatedDate = updatedDate.updated_date;
                                    var diffDays = "";
                                    var dateObj2 = conf.momentDate(updatedDate,"YYYY-MM-DD");
                                    diffDays = dateObj.diff(dateObj2, 'days');
                                    if(home_post_code != studentAddressData.previous_home_post_code) {
                                        if(diffDays >= 90) {
                                            previous_home_post_code = "";
                                            previous_home_post_code = '{"home_post_code" :' + studentAddressData.home_post_code + ', "updated_date" : "' + newPreviousDate + '"}';
                                            updatedAddress.previous_home_post_code = previous_home_post_code;
                                        } 
                                    }
                                }
                            }
                            
                            if(home_city != "" || home_city != "undefined") {
                                if(previous_home_city == null || previous_home_city == "") {
                                    console.log("if2");
                                    var previous_home_city = '{"home_city" : "' + home_city + '", "updated_date" : "' + newPreviousDate + '"}';
                                    updatedAddress.previous_home_city_id = previous_home_city;
                                } else {
                                    updatedDate = JSON.parse(studentAddressData.previous_home_city_id);
                                    updatedDate = updatedDate.updated_date;
                                    var diffDays = "";
                                    var dateObj2 = conf.momentDate(updatedDate,"YYYY-MM-DD");
                                    diffDays = dateObj.diff(dateObj2, 'days');
                                    console.log("else2" + updatedDate);
                                    if(home_city != studentAddressData.previous_home_city_id) {
                                        if(diffDays >= 90) {
                                            previous_home_city = "";
                                            previous_home_city = '{"home_city" : ' +  studentAddressData.home_city_id + ', "updated_date" : ' + newPreviousDate + '}';
                                            updatedAddress.previous_home_city = previous_home_city;
                                        }
                                    }
                                }
                            }

                            if(home_address_one != "" || home_address_one != "undefined") {
                                console.log(previous_home_address_one +"dasda");
                                if(previous_home_address_one == null || previous_home_address_one == "") {
                                    console.log("if");
                                    var previous_home_address_one = '{"home_address_one" : "' + home_address_one +'", "updated_date" : "'+ newPreviousDate+'"}';
                                    updatedAddress.previous_home_address_line_one = previous_home_address_one;
                                } else {
                                    updatedDate = JSON.parse(studentAddressData.previous_home_address_line_one);
                                    updatedDate = updatedDate.updated_date;
                                    var diffDays = "";
                                    var dateObj2 = conf.momentDate(updatedDate,"YYYY-MM-DD");
                                    diffDays = dateObj.diff(dateObj2, 'days');
                                    if(home_address_one != studentAddressData.previous_home_address_line_one) {
                                        if(diffDays >= 90) {
                                            previous_home_address_one = "";
                                            previous_home_address_one = '{"home_address_one" :' + studentAddressData.home_address_line_one + ', "updated_date" : "' + newPreviousDate + '"}';
                                            updatedAddress.previous_home_address_one = previous_home_address_one;
                                        } 
                                    }
                                }
                            }

                            if(home_address_two != "" || home_address_two != "undefined") {
                                console.log(previous_home_address_two +"dasda");
                                if(previous_home_address_two == null || previous_home_address_two == "") {
                                    console.log("if");
                                    var previous_home_address_two = '{"home_address_two" : "' + home_address_two +'", "updated_date" : "'+ newPreviousDate+'"}';
                                    updatedAddress.previous_home_address_line_two = previous_home_address_two;
                                } else {
                                    updatedDate = JSON.parse(studentAddressData.previous_home_address_line_two);
                                    updatedDate = updatedDate.updated_date;
                                    var diffDays = "";
                                    var dateObj2 = conf.momentDate(updatedDate,"YYYY-MM-DD");
                                    diffDays = dateObj.diff(dateObj2, 'days');
                                    if(home_address_two != studentAddressData.previous_home_address_line_two) {
                                        if(diffDays >= 90) {
                                            previous_home_address_two = "";
                                            previous_home_address_two = '{"home_address_two" :' + studentAddressData.home_address_line_two + ', "updated_date" : "' + newPreviousDate + '"}';
                                            updatedAddress.previous_home_address_two = previous_home_address_two;
                                        } 
                                    }
                                }
                            }
                            
                            if(home_prefecture_id != "" || home_prefecture_id != "undefined") {
                                console.log(home_prefecture_id +"dasda");
                                if(previous_home_prefecture == null || previous_home_prefecture == "") {
                                    console.log("if");
                                    var previous_home_prefecture = '{"home_prefecture" : "' + previous_home_prefecture +'", "updated_date" : "'+ newPreviousDate+'"}';
                                    updatedAddress.previous_home_prefecture = previous_home_prefecture;
                                } else {
                                    updatedDate = JSON.parse(studentAddressData.previous_home_prefecture_id);
                                    updatedDate = updatedDate.updated_date;
                                    var diffDays = "";
                                    var dateObj2 = conf.momentDate(updatedDate,"YYYY-MM-DD");
                                    diffDays = dateObj.diff(dateObj2, 'days');
                                    if(home_address_two != studentAddressData.previous_home_prefecture_id) {
                                        if(diffDays >= 90) {
                                            previous_home_prefecture = "";
                                            previous_home_prefecture = '{"home_prefecture" :' + studentAddressData.home_prefecture_id + ', "updated_date" : "' + newPreviousDate + '"}';
                                            updatedAddress.previous_home_prefecture = previous_home_prefecture;
                                        } 
                                    }
                                }
                            }

                            studentAddressData.updateAttributes(updatedAddress
                            ).then(function(finalResult){ 
                                res.rest.success("Profile has been edited successfully");
                            });  
                        }) 
                    }) 
                } else {
                    res.rest.success("Student not found");
                } 
            })  
            
        },

        studentUpcomingLessons : function(req, res , next) {
            var data = scheduleLessonStudentComponent.upcomingLessons(req.body).then(function(dt){
                res.rest.success(dt);
            });
            //res.rest.success(data);
        },

    },

    get: {
        test : function (req, res, next){
            
        res.rest.success('Hello Sabina');
        },

        testemail : function(req, res, next) {
            res.mailer.send('email', {
                to: 'bhawana.soni@a3logics.in', 
                subject: 'Test Email', 
              }, function (err) {
                if (err) {
                  // handle error 
                  res.send('There was an error sending the email');
                  return;
                }
                res.send('Email Sent');
              });
        }
        
    }
}