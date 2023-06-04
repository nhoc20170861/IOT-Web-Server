const fs = require('fs');
const sharp = require('sharp');
const path = require('path');
module.exports = {
    uploadSingleFile: async (req, res) => {
        try {
            const { filename: image } = req.file;
            console.log('🚀 ~ file: UploadController.js:8 ~ uploadSingleFile: ~ req.file:', req.file);
            if (!image) {
                const error = new Error('Please upload a file');
                error.httpStatusCode = 400;
                return next(error);
            }

            // var img = fs.readFileSync(req.file.path);
            // var encode_image = img.toString('base64');
            // // Define a JSONobject for the image attributes for saving to database

            // var finalImg = {
            //     contentType: req.file.mimetype,
            //     image: new Buffer.from(encode_image, 'base64')
            // };
            // console.log('🚀 ~ file: UploadController.js:13 ~ uploadSingleFile: ~ finalImg:', finalImg);

            await sharp(req.file.path)
                .resize(400, 400, {})
                .jpeg({ quality: 90 })
                .toFile(path.resolve(req.file.destination, 'resized', image))
                .then((data) => {
                    console.log(data);
                })
                .catch((err) => {
                    console.log(err);
                });
            fs.unlinkSync(req.file.path);

            res.contentType('application/json');
            res.send({
                message: 'upload image success',
                success: true
            });
        } catch (error) {}
    },
    uploadMultipleFiles: async (req, res) => {
        res.json(req.files);
    }
};
