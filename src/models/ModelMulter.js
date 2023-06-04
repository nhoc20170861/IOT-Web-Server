const multer = require('multer');
const path = require('path');
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/public/images/uploads/');
    },
    filename: (req, file, cb) => {
        const fileName = path.parse(file.originalname).name + '_' + Date.now() + path.extname(file.originalname);
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});

module.exports = upload;
