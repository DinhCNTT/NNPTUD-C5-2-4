const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 25,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "",
        pass: "",
    },
});
module.exports = {
    sendMail: async function (to, url) {
        const info = await transporter.sendMail({
            from: 'hehehe@gmail.com',
            to: to,
            subject: "reset password URL",
            text: "click vao day de doi pass", // Plain-text version of the message
            html: "click vao <a href=" + url + ">day</a> de doi pass", // HTML version of the message
        });

        console.log("Message sent:", info.messageId);
    },
    sendPasswordMail: async function (to, password) {
        const info = await transporter.sendMail({
            from: 'admin@nnptud.com',
            to: to,
            subject: "Your New Account Information",
            text: `Welcome! Your account has been created. Your password is: ${password}`,
            html: `Welcome! Your account has been created.<br/>Your password is: <b>${password}</b>`,
        });

        console.log("Password email sent to", to, "ID:", info.messageId);
    }
}
