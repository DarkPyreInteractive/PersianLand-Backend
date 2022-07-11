const db = require('../models')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const sgMail = require('@sendgrid/mail')
const dotenv = require('dotenv')

dotenv.config()

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const mUser = db.user

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}

const sendMail = async function(MailObject){
    if (!MailObject.hasOwnProperty('to') || !MailObject.hasOwnProperty('subject') || !MailObject.hasOwnProperty('text') || !MailObject.hasOwnProperty('html')) {
        console.log({
            title: "Missing parameter sent",
            allow_parameter: ["to", "subject", "text", "html"],
            error_parameter: Object.keys(MailObject).filter(item => !["to", "subject", "text", "html"].includes(item))
        })
        return false
    }
    try {
        await sgMail.send({
            to: MailObject.to,
            from: 'admin@darkpyre.com',
            subject: MailObject.subject,
            text: MailObject.text,
            html: MailObject.html,
        });
        return true
    } catch (err) {
        console.log(err.response.body.errors)
        return false
    }
}

const sendVerificationMail = async function(receipent, subject, text) {

	// console.log(text)
	// var transporter = nodemailer.createTransport({
	// 	service: 'gmail',
	// 	auth: {
	// 		user: 'youremail@gmail.com',
	// 		pass: 'yourpassword'
	// 	}
	// })

	// var mailOptions = {
	// 	from: 'youremail@gmail.com',
	// 	to: receipent,
	// 	subject: subject,
	// 	text: text
	// }

	// transporter.sendMail(mailOptions, function(error, info){
	// 	if (error) {
	// 		console.log(error)
	// 		return false
	// 	} else {
	// 		console.log('Email sent: ' + info.response)
	// 		return true
	// 	}
	// })

	
	
	return true
}

exports.userSignup = async(req, res) => {
	const { email, password, username } = req.body

	const existing_user = await mUser.findOne({is_deleted: '0', email: email})
	
	const new_otp = getRndInteger(100000, 999999).toString()

	if (existing_user) {
		if (existing_user.isEmailVerified) {
			return res.status(200).send({
				status: 'fail',
				message: 'Same email already exists. Try again with another one.'
			})
		}
		else {
			// resend frontend

			const isMailResent = await sendMail({
				to: existing_user.email,
				subject: 'No Reply',
				text: 'verify your email account',
				html: '<html>Your verification code is ' + new_otp + '</html>'
			})
			
			if (!isMailResent) {
				return res.status(200).send({
					status: 'fail',
					message: 'Internal Mail Server Error.'
				})
			}
		
			existing_user.otp = new_otp
			existing_user.status = 1		//signed but not verified
			await existing_user.save()

			return res.status(200).send({
				status: 'fail',
				message: 'Your account is not verified. Check your email.'
			})
		}
	}

	const createdUser = await mUser.create({
		username: username,
        email: email,
        password: password,
        isEmailVerified: false,
        otp: "",
        avatar: 0,
		background: 0,
        otpDate: null,
        blockedByAdmin: false,
        childrenUsers: [],
        reward: 0,
        myReferalcode: "",
        privateKey: "",
        publicKey: "",
		status: 0,
		token: ""
	})

	const isMailSent = await sendMail({
		to: createdUser.email,
		subject: 'No Reply',
		text: 'verify your email account',
		html: '<html>Your verification code is ' + new_otp + '</html>'
	})
	
	if (!isMailSent) {
		return res.status(200).send({
			status: 'fail',
			message: 'Internal Mail Server Error.'
		})
	}

	createdUser.otp = new_otp
	createdUser.status = 1		//signed but not verified
	await createdUser.save()

	return res.status(200).send({
		status: 'success',
		message: 'Please check your mail to verify your account.'
	})
}

exports.userResendVerifyOTP = async(req, res) => {
	const { email } = req.body

	const user_data = await mUser.findOne({is_deleted: '0', email: email})

	if (user_data === null) {
		return res.status(200).send({
			status: 'fail',
			message: 'no existing user',
			email: email
		})
	}

	const new_otp = getRndInteger(100000, 999999).toString()

	const isMailSent = await sendMail({
		to: user_data.email,
		subject: 'No Reply',
		text: 'verify your email account',
		html: '<html>Your verification code is ' + new_otp + '</html>'
	})
	
	if (!isMailSent) {
		return res.status(200).send({
			status: 'fail',
			message: 'Internal Mail Server Error.'
		})
	}

	user_data.otp = new_otp
	user_data.status = 1		//signed but not verified
	await user_data.save()

	return res.status(200).send({
		status: 'success',
		message: 'Please check your mail to verify your account.'
	})
}

exports.userVerify = async(req, res) => {
	const { email, otp_code } = req.body

	const user = await mUser.findOne({email: email, otp: otp_code, is_deleted: '0'})

	if (user === null) {
		return res.status(200).send({
			status: 'fail',
			message: 'verification failed. Try again.' //'You are not a right candidate for the verification.'
		})
	}
	else if (user.status !== 1) {
		return res.status(200).send({
			status: 'fail',
			message: 'You are not a right candidate for the verification.'
		})
	}

	const new_token = jwt.sign({data: user._id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRE})

	user.isEmailVerified = true
	user.status = 2	//email verified
	user.otpDate = new Date()
	user.token = new_token
	await user.save()

	return res.status(200).send({
		status: 'success',
		token: new_token,
		message: 'verification succeed'
	})
}

exports.userForgetPassword = async(req, res) => {
	const { email } = req.body

	const user = await mUser.findOne({email: email, is_deleted: '0'})

	if (user === null) {
		return res.status(200).send({
			status: 'fail',
			message: `no existing user: ${email}`
		})
	}
	else if (user.status !== 2 && user.status !== 4) { //email verified status

		return res.status(200).send({
			status: 'fail',
			message: 'You are not a right candidate for updating your password.'
		})
	}

	const new_secret = getRndInteger(100000, 999999).toString()

	user.otp = new_secret
	await user.save()

	const isMailSent = sendMail({
		to: user.email,
		from: 'admin@darkpyre.com',
		subject: 'No Reply',
		text: 'Forgot Password',
		html: '<html>try to use secret code ' + new_secret + 'to reset the password</html>'
	})
	
	if (!isMailSent) {
		return res.status(200).send({
			status: 'fail',
			message: 'Internal Mail Server Error.'
		})
	}

	user.status = 3		//forget password secret phrase sent
	await user.save()

	return res.status(200).send({
		status: 'success',
		message: 'Please check your mail to update your password.'
	})
}

exports.userResendForgotOTP = async(req, res) => {
	const { email } = req.body

	const user_data = await mUser.findOne({is_deleted: '0', email: email})

	if (user_data === null) {
		return res.status(200).send({
			status: 'fail',
			message: 'no existing user',
			email: email
		})
	}

	const new_otp = getRndInteger(100000, 999999).toString()

	const isMailSent = await sendMail({
		to: user_data.email,
		subject: 'No Reply',
		text: 'verify your email account',
		html: '<html>Your verification code is ' + new_otp + '</html>'
	})
	
	if (!isMailSent) {
		return res.status(200).send({
			status: 'fail',
			message: 'Internal Mail Server Error.'
		})
	}

	user_data.otp = new_otp
	user_data.status = 3		//signed but not verified
	await user_data.save()

	return res.status(200).send({
		status: 'success',
		message: 'Please check your mail to verify your forgot otp code.'
	})
}

exports.userVerifyForgotOTP = async(req, res) => {
	const { email, otp } = req.body

	const user_data = await mUser.findOne({email: email, otp: otp, is_deleted: '0'})

	if (user_data == null) {
		return res.status(200).send({
			status: 'fail',
			message: `Entered OTP is incorrect.`
		})
	}

	if (user_data.status !== 3) { //forget password secret phrase sent
		return res.status(200).send({
			status: 'fail',
			message: 'You are not a right candidate for verifying your forgot password.'
		})
	}

	user_data.status = 5
	await user_data.save()

	return res.status(200).send({
		status: 'success',
		message: 'Your forgot OTP is successfully verified.'
	})
}

exports.userUpdatePassword = async(req, res) => {
	const { email, password } = req.body

	const user = await mUser.findOne({email: email, is_deleted: '0'})

	if (user === null) {
		return res.status(200).send({
			status: 'fail',
			message: `No existing User.`
		})
	}
	
	if (user.status !== 5) { //forget password secret phrase sent
		return res.status(200).send({
			status: 'fail',
			message: 'You are not verified for forgot OTP.'
		})
	}

	user.password = password
	user.status = 2
	await user.save()

	return res.status(200).send({
		status: 'success',
		message: 'Your password is successfully updated.'
	})
}

exports.userLogin = async(req, res) => {
	const { email, password } = req.body
	
	const user_data = await mUser.findOne({email: email, password: password, is_deleted: '0'})

	if (user_data === null) {
		return res.status(200).send({
			status: 'fail',
			message: 'incorrect user email and password'
		})
	}

	if (!user_data.isEmailVerified) { //email verified
		
		return res.status(200).send({
			status: 'fail',
			message: 'your account is not verified yet.'
		})
	}

	if (!!user_data.blockedByAdmin) {
		return res.status(200).send({
			status: 'fail',
			message: 'Your account is blocked by admin.'
		})
	}

	const new_token = jwt.sign({data: user_data._id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRE})

	user_data.token = new_token
	await user_data.save()

	return res.status(200).send({
		status: 'success',
		token: new_token
	})
}

exports.userAuth = async(req, res) => {
	const { token } = req.body

	const user_data = await mUser.findOne({token: token, is_deleted: '0'})

	if (user_data === null) {
		return res.status(200).send({
			status: 'fail',
			token: token,
			message: 'unauthorized token'
		}) 
	}

	user_data.status = 4 // authorized
	user_data.is_login = '1'

	await user_data.save()

	const auth_data = {
		id: user_data._id,
		otp: user_data.otp,
		isEmailVerified: user_data.isEmailVerified,
		email: user_data.email,
		avatar: user_data.avatar,
		background: user_data.background,
		otpDate: user_data.otpDate,
		blockedByAdmin: user_data.blockedByAdmin,
		childrenUsers: user_data.childrenUsers,
		createdAt: user_data.createdAt,
		updatedAt: user_data.updatedAt,
		myReferalcode: user_data.myReferalcode,
		password: user_data.password,
		privateKey: user_data.privateKey,
		publicKey: user_data.publicKey,
		username: user_data.username
	}

	return res.status(200).send({
		status: 'success',
		res: auth_data,
		token: user_data.token,
		message: 'ok'
	})
}

exports.userDelete = async(req, res) => {
	const { email } = req.body

	const user_data = await mUser.findOne({email: email, is_deleted: '0'})

	if (user_data === null) {
		return res.status(200).send({
			status: 'fail',
			message: 'no existing user'
		}) 
	}

	user_data.is_deleted = '1'

	await user_data.save()

	return res.status(200).send({
		status: 'success',
		message: 'successfully deleted.'
	})
}

exports.userUpdateAvatar = async(req, res) => {
	const { email, avatar, background } = req.body

	const user_data = await mUser.findOne({email: email, is_deleted: '0'})

	if (user_data === null) {
		return res.status(200).send({
			status: 'fail',
			message: 'no existing user'
		}) 
	}

	user_data.avatar = avatar
	user_data.background = background

	await user_data.save()

	return res.status(200).send({
		status: 'success',
		message: 'successfully updated avatar and background.'
	})
}