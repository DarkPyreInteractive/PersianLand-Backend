const controller = require('../controllers/user.controller')

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'x-access-token, Origin, Content-Type, Accept'
    )
    next()
  })

  app.post('/user_signup', controller.userSignup)
  app.post('/user_resend_verifycode', controller.userResendVerifyOTP)
  app.post('/user_verify', controller.userVerify)
  app.post('/user_forget_password', controller.userForgetPassword)
  app.post('/user_resend_forgotcode', controller.userResendForgotOTP)
  app.post('/user_verify_forgot', controller.userVerifyForgotOTP)
  app.post('/user_update_password', controller.userUpdatePassword)
  app.post('/user_login', controller.userLogin)
  app.post('/user_auth', controller.userAuth)
  app.post('/user_delete', controller.userDelete)
  app.post('/user_update_avatar', controller.userUpdateAvatar)
}