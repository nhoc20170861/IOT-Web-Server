// JWT stores in localstorage

const jwt = require('jsonwebtoken');
// import dotenv from 'dotenv';

// dotenv.config();
// Function used to create accessToken
export const signAccessToken = async (payload) => {
    console.log('🚀 ~ file: auth.controller.js:14 ~ signAcssToken ~ signAcssToken:', process.env.ACCESS_TOKEN_SECRET);
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: 60 //expire after 1h
    });
    return accessToken;
};
// Function used to create refreshToken
export const signRefreshToken = async (payload) => {
    console.log('🚀 ~ file: auth.controller.js:14 ~ REFRESH_TOKEN_SECRET ~ REFRESH_TOKEN_SECRET:', process.env.REFRESH_TOKEN_SECRET);
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: 3600 * 24 * 10
    });
    return refreshToken;
};

export const verifyTokenInHeaderReq = async (req, res, next) => {
    try {
        const accessToken = req.headers.authorization;
        if (accessToken) {
            console.log('🚀 ~ file: auth.controller.js:33 ~ verifyToken ~ accessToken:', accessToken);
            jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    throw err;
                }
                req.userId = decoded.id;
                req.userName = decoded.username;
                return next();
            });
        } else {
            return res.send({
                errorCode: 403,
                message: 'No token provided!'
            });
        }
    } catch (error) {
        console.log('🚀 ~ file: handleJwt.js:41 ~ verifyTokenInHeaderReq ~ error:', error.name);
        if (error.name === 'TokenExpiredError')
            return res.send({
                errorCode: 401,
                message: error.message
            });

        return res.send({
            errorCode: 500,
            message: error
        });
    }
};

export const verifyRefreshToken = (req, res, next) => {
    let refresh_token = req.body.refreshToken;
    console.log('🚀 ~ file: handleJwt.js:56 ~ verifyRefreshToken ~ req.headers:', req.body);
    if (!refresh_token) {
        return res.status(403).send({
            success: false,
            message: 'No refresh token provided!'
        });
    }

    jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.send({
                success: false,
                message: err
            });
        }
        req.userId = decoded.id;
        req.userName = decoded.username;
        next();
    });
};
