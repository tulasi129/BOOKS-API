const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());

const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

//databseConnection

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//GET BOOKS API
app.get("/books/", async (request, response) => {
  const getBooksQuery = `
    SELECT
      *
    FROM
      book
    ORDER BY
      book_id;`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

//GET BOOK API
app.get("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const getBookQuery = `
    SELECT
      *
    FROM
      book
    WHERE
      book_id=${bookId};`;
  const book = await db.get(getBookQuery);
  response.send(book);
});

//ADD BOOK API
app.post("/books/", async (request, response) => {
  const bookDetails = request.body;
  const {
    title,
    authorId,
    rating,
    ratingCount,
    reviewCount,
    description,
    pages,
    dateOfPublication,
    editionLanguage,
    price,
    onlineStores,
  } = bookDetails;
  const addBookQuery = `
    INSERT INTO
      book (title,author_id,rating,rating_count,review_count,description,pages,date_of_publication,edition_language,price,online_stores)
    VALUES
      (
        '${title}',
         ${authorId},
         ${rating},
         ${ratingCount},
         ${reviewCount},
        '${description}',
         ${pages},
        '${dateOfPublication}',
        '${editionLanguage}',
         ${price},
        '${onlineStores}'
      );`;

  const dbResponse = await db.run(addBookQuery);
  const bookId = dbResponse.lastID;
  response.send(`bookId: ${bookId} updated successfully `);
});

//UPDATE BOOK API
app.put("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const bookDetails = request.body;
  const {
    title,
    authorId,
    rating,
    ratingCount,
    reviewCount,
    description,
    pages,
    dateOfPublication,
    editionLanguage,
    price,
    onlineStores,
  } = bookDetails;
  const updateBookQuery = `
    UPDATE book 
    SET
        title='${title}',
        author_id= ${authorId},
        rating=${rating},
        rating_count=${ratingCount},
        review_count=${reviewCount},
        description='${description}',
        pages=${pages},
        date_of_publication='${dateOfPublication}',
        edition_language='${editionLanguage}',
        price=${price},
        online_stores= '${onlineStores}'
    WHERE 
       book_id=${bookId}
      ;`;

  await db.run(updateBookQuery);
  response.send("Book Updated Successfully");
});

//DELETE BOOK API
app.delete("/books/:bookId", async (request, response) => {
  const { bookId } = request.params;
  const deleteQuery = `
    DELETE FROM book 
    WHERE book_id=${bookId}`;
  await db.get(deleteQuery);
  response.send("bookDeleted Succesfully");
});

//REGISTER USER API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userQuery = `SELECT * FROM user WHERE username='${username}'`;
  const dbuser = await db.get(userQuery);
  if (dbuser === undefined) {
    const addUserQuery = `
    INSERT INTO user(username,name,password,gender,location)
        VALUES(
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}')`;
    const dbResponse = await db.run(addUserQuery);
    const newUserId = dbResponse.lastID;
    response.send(`Created new user with userId ${newUserId}`);
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

//LOGIN USER API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selecteduser = `SELECT * FROM user WHERE username='${username}'`;
  const dbuser = await db.get(selecteduser);
  if (dbuser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const comparePassword = await bcrypt.compare(password, dbuser.password);
    if (comparePassword) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "secret_token");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//TOKEN AUTHENTICATION
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const aboutHeader = request.headers["authorization"];
  if (aboutHeader !== undefined) {
    jwtToken = aboutHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    console.log(jwtToken);
    response.send("Invalid Access token1");
  } else {
    jwt.verify(jwtToken, "secret_token", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid Access token2");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//GET BOOKS WITH JWT API

app.get("/books/", authenticateToken, async (request, response) => {
  let { username } = request;
  const booksQuery = `
    SELECT * FROM book`;
  const dbReponse = await db.all(booksQuery);
  response.send(dbReponse);
});

//GET PROFILE DEATILS API
app.get("/profile/", authenticateToken, async (request, response) => {
  let { username } = request;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);
  response.send(userDetails);
});
