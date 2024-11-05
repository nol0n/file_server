const express = require(`express`);
const fs = require(`fs`);
const path = require(`path`);
const formidable = require(`formidable`);
const mime = require(`mime-types`); 
const app = express();
const { Pool } = require(`pg`);
const pool = new Pool({
    user: `postgres`,
    host: `localhost`,
    database: `lab_2`,
    password: `123456`,
    port: 5432,
})

app.use(express.json())

const tableName = `files`;

const checkAndCreateTable = async () => {
    try {
        const result = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`, [tableName]);

        if (!result.rows[0].exists) {
            await pool.query(`
                CREATE TABLE ${tableName} (
                filename TEXT,
                ratings INTEGER[] NULL,
                reviews TEXT[] NULL,
                reviews_amount INTEGER
                );
            `);
            console.log(`Таблица ${tableName} создана.`);
        } else {
            console.log(`Таблица ${tableName} уже существует.`);
        }
    } catch (error) {
        console.error(`Ошибка при подключении к базе данных или выполнении запроса: : ${error}`);
    }
};

checkAndCreateTable();

const uploadFolder = `../files`;

const uploadDir = path.join(__dirname, uploadFolder);
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log(`Путь ${uploadFolder} создан.`);
} else {
    console.log(`Путь ${uploadFolder} уже сущетсвует.`);
}

app.post(`/upload_file`, async function(req, res) {
    try {
        const form = new formidable.IncomingForm();
        let fields;
        let files;
        [fields, files] = await form.parse(req);

        const result = await pool.query(`SELECT EXISTS (SELECT 1 FROM files WHERE filename = $1)`, [files[`file_to_upload`][0].originalFilename]);
        
        if (!result.rows[0].exists) {
            fs.readFile(files[`file_to_upload`][0].filepath, function (error, data) {
                if (error) console.log(`Ошибка чтения файла: ${error}`);
        
                fs.writeFile(`./files/`+files[`file_to_upload`][0].originalFilename, data, function (error) {
                    if (error) console.log(`Ошибка записи файла: ${error}`);
                });
        
                fs.unlink(files[`file_to_upload`][0].filepath, function (error) {
                    if (error) console.log(`Ошибка удаления файла: ${error}`);
                });
            });
            await pool.query(`INSERT INTO files (filename, reviews_amount) VALUES ($1, $2)`, [files[`file_to_upload`][0].originalFilename, 0]);
            
            console.log(`Загружен новый файл`);
            res.json({"success": true});
        }
        else {
            console.log(`Попытка загрузки сущесвтующего файла`);
            res.json({"success": false, "reason": `Файл с таким именем уже есть на сервере`});
        }

        res.end();
    } catch (error) {
        console.log(`Ошибка post запроса: ${error}`);
        res.status(500);
        res.end();
    }
})

app.get(`/get_file_names`, async function(req, res) {
    try {
        const fileNamesQuery = await pool.query(`SELECT filename FROM files ORDER BY reviews_amount LIMIT 3;`);

        fileNames = fileNamesQuery.rows.map((row) => row.filename);
        res.send(fileNames);
        res.end();
    } catch (error) {
        console.log(`Ошибка get запроса: ${error}`);
        res.status(500);
        res.end();
    }
})

app.get(`/load_file`, async function(req, res) {
    try {    
        fileName = req.query.name;

        fs.readFile(`./files/${fileName}`, (error, file) => {
            if (error) {
                console.error(`Ошибка при чтении файлов:`, error);
                return res.status(500).send(`Внутренняя ошибка сервера`);
            }
            
            const contentType = mime.lookup(fileName);

            res.setHeader(`Content-Type`, contentType);
            res.setHeader(`Content-Disposition`, `inline`);
            res.send(file);
        });
    } catch (error) {
        console.log(`Ошибка get запроса: ${error}`);
        res.status(500);
        res.end();
    }
})

app.post(`/send_review`, async function(req, res) {
    const form = new formidable.IncomingForm();
    let fields;
    let files;
    [fields, files] = await form.parse(req);

    try {
        await pool.query(`
            UPDATE files
                SET 
                    ratings = array_append(ratings, $1),
                    reviews = array_append(reviews, $2),
                    reviews_amount = reviews_amount + 1
                WHERE filename = $3;`,
                [fields.rating[0], fields.review[0], fields.filename[0]]);

        console.log(`Отправлен ` + fields.filename[0]);

        res.end();
    } catch (error) {
        console.log(`Ошибка обращения к базе данных: ${error}`);
        res.status(500);
        res.end();
    }
})

app.get(`/get_reviews`, async function(req, res) {
    try {    
        fileName = req.query.name;

        const ratingsQuery = await pool.query(`SELECT ratings FROM files WHERE filename = $1;`, [fileName]);
        ratings = ratingsQuery.rows.map((row) => row.ratings);
        const reviewsQuery = await pool.query(`SELECT reviews FROM files WHERE filename = $1;`, [fileName]);
        reviews = reviewsQuery.rows.map((row) => row.reviews);

        res.json({ratings: ratings, reviews: reviews});
        res.end();
    } catch (error) {
        console.log(`Ошибка get запроса: ${error}`);
        res.status(500);
        res.end();
    }
})

app.listen(5500);