const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'recipes.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      cookTime TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.get("SELECT COUNT(*) as count FROM recipes", (err, row) => {
    if (err) {
      console.error('Error checking recipes count:', err);
      return;
    }
    
    if (row.count === 0) {
      console.log('Adding sample recipes...');
      const sampleRecipes = [
        {
          name: 'Classic Chocolate Chip Cookies',
          ingredients: '2 cups all-purpose flour\n1 cup butter, softened\n3/4 cup brown sugar\n1/2 cup white sugar\n2 large eggs\n2 tsp vanilla extract\n1 tsp baking soda\n1 tsp salt\n2 cups chocolate chips',
          instructions: 'Preheat oven to 375°F. Mix butter and sugars until creamy. Beat in eggs and vanilla. Combine dry ingredients and mix into butter mixture. Stir in chocolate chips. Drop rounded tablespoons onto ungreased cookie sheets. Bake 9-11 minutes until golden brown.',
          cookTime: '25 minutes'
        },
        {
          name: 'Simple Pasta Carbonara',
          ingredients: '400g spaghetti\n200g pancetta or bacon\n4 large eggs\n100g Parmesan cheese, grated\n2 cloves garlic, minced\nSalt and black pepper\n2 tbsp olive oil',
          instructions: 'Cook pasta according to package directions. Meanwhile, cook pancetta until crispy. Whisk eggs with Parmesan, salt, and pepper. Drain pasta, reserving 1 cup pasta water. Quickly toss hot pasta with egg mixture and pancetta. Add pasta water as needed for creamy consistency.',
          cookTime: '20 minutes'
        }
      ];

      const stmt = db.prepare("INSERT INTO recipes (name, ingredients, instructions, cookTime) VALUES (?, ?, ?, ?)");
      sampleRecipes.forEach(recipe => {
        stmt.run(recipe.name, recipe.ingredients, recipe.instructions, recipe.cookTime);
      });
      stmt.finalize();
    }
  });
});

module.exports = db;