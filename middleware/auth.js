const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req , res , next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({error: "Not authorized, no token"})
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({error: "User not found"});
        }

        req.user = user;

        next();
    } catch (err) {
        console.error("AUTH ERROR ❌", err);
        res.status(401).json({error: "Not authorized"});
    }
}

module.exports = protect;