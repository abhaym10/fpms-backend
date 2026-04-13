const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async(req, res) => {
    try {
        const {name , email , password} = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({error: "All fields required"});
        }

        const existingUser = await User.findOne({email});
        if (existingUser) {
            return res.status(400).json({error: "Email already registered"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name, 
            email,
            password: hashedPassword,
        });

        const token = jwt.sign(
            {id: user._id},
            process.env.JWT_SECRET,
            {expiresIn: "7d"}
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("REGISTER ERROR ❌", err);
        res.status(500).json({error: "Server error"});
    }
});

router.post("/login" , async(req, res) => {
    console.log("LOGIN HIT");
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            return res.status(400).json({error: "All fields required"});
        }

        const user = await User.findOne({email});

        if (!user) {
            return res.status(400).json({error: "Invalid credentials"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return
            res.status(400).json({error: "Invalid credentials"});
        }

        const token = jwt.sign(
            {id: user._id},
            process.env.JWT_SECRET,
            {expiresIn: "7d"}
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("LOGIN ERROR ❌", err);
        res.status(500).json({error: "Server error"});
    }
});

module.exports = router;