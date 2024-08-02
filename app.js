const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const app = express();

const connection = mysql.createConnection({
  //host: 'localhost',
  //user: 'root',
  //password: '',
  //database: 'c237_fitnessequipmentapp'
  host: 'db4free.net',
  user: 'dylan23020421',
  password: '23020421',
  database: 'fitnessequipment'
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images'); 
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});


app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));


app.get('/', (req, res) => {
  const sql = 'SELECT * FROM products';
  connection.query(sql, (error, results) => {
    if (error) {
      console.error('Database query error', error.message);
      return res.status(500).send('Error retrieving products');
    }
    res.render('index', { products: results });
  });
});

app.get('/products/:productId', (req, res) => {
  const productId = req.params.productId;
  const sql = 'SELECT products.productId, products.productName, products.productImage, products.productPrice, products.quantity, products.productBrand, category.categoryName FROM products JOIN category ON category.categoryId=products.categoryId WHERE productId = ?';

  connection.query(sql, [productId], (error, results) => {
    if (error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error retrieving product by ID');
    }

    if (results.length > 0) {
      res.render('products', { products: results[0] });
    } else {
      res.status(404).send('Product not found');
    }
  });
});

app.get('/addProduct', (req, res) => {
  res.render('addProduct');
});

app.post('/addProduct', upload.single('image'), (req, res) => {
  const { productName, productPrice, quantity, productBrand, categoryName } = req.body;
  let productImage = req.file ? req.file.filename : null;

  connection.beginTransaction((err) => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).send('Error starting transaction');
    }

    const insertCategorySQL = 'INSERT INTO category (categoryName) VALUES (?) ON DUPLICATE KEY UPDATE categoryName = categoryName';
    connection.query(insertCategorySQL, [categoryName], (error, categoryResults) => {
      if (error) {
        return connection.rollback(() => {
          console.error('Error inserting category:', error);
          res.status(500).send('Error inserting category');
        });
      }

      const categoryId = categoryResults.insertId;

      const insertProductSQL = 'INSERT INTO products (productName, productImage, productPrice, quantity, productBrand, categoryId) VALUES (?, ?, ?, ?, ?, ?)';
      connection.query(insertProductSQL, [productName, productImage, productPrice, quantity, productBrand, categoryId], (error, productResults) => {
        if (error) {
          return connection.rollback(() => {
            console.error('Error inserting product:', error);
            res.status(500).send('Error inserting product');
          });
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              console.error('Error committing transaction:', err);
              res.status(500).send('Error committing transaction');
            });
          }
          res.redirect('/');
        });
      });
    });
  });
});


app.get('/editProduct/:productId', (req, res) => {
  const sql = 'SELECT products.productId, products.productName, products.productImage, products.productPrice, products.quantity, products.productBrand, category.categoryName FROM products JOIN category ON category.categoryId=products.categoryId WHERE productId = ?';

  const productId = req.params.productId;
  
  connection.query(sql, [productId], (error, results) => {
    if (error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error retrieving product by ID');
    }
    
    if (results.length > 0) {
      
      res.render('editProduct', { products: results[0] });
    } else {
      
      res.status(404).send('Product not found');
    }
  });
});

app.post('/editProduct/:productId', upload.single('image'), (req, res) => {
  const productId = req.params.productId;
  const { productName, productPrice, quantity, productImage, Brand, categoryName } = req.body;
  let image = req.body.productImage;

  if (req.file) {
    image = req.file.filename;
  }

  connection.beginTransaction((err) => {
    if (err) {
      return res.status(500).send('Error starting transaction');
    }

    const updateProductSQL = 'UPDATE products SET productName = ?, productPrice = ?, productImage = ?, quantity = ?, productBrand = ? WHERE productId = ?';
    connection.query(updateProductSQL, [productName, productPrice, image, quantity, Brand, productId], (error, results) => {
      if (error) {
        return connection.rollback(() => {
          console.error("Error updating product:", error);
          res.status(500).send("Error updating product");
        });
      }

      const updateCategorySQL = 'UPDATE category SET categoryName = ? WHERE categoryId = (SELECT categoryId FROM products WHERE productId = ?)';
      connection.query(updateCategorySQL, [categoryName, productId], (error, results) => {
        if (error) {
          return connection.rollback(() => {
            console.error("Error updating category:", error);
            res.status(500).send("Error updating category");
          });
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              console.error("Error committing transaction:", err);
              res.status(500).send("Error committing transaction");
            });
          }
          res.redirect('/');
        });
      });
    });
  });
});

app.get('/deleteProduct/:productId', (req, res) => {
  const productId = req.params.productId;
  const sql = 'DELETE FROM products WHERE productId = ?';
  connection.query(sql, [productId], (error, results) => {
    if (error) {
      
      console.error("Error deleting product:", error);
      res.status(500).send('Error deleting product');
    } else {
      
      res.redirect('/');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
