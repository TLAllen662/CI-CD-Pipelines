const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

const sampleRecipes = [
  {
    name: 'Classic Chocolate Chip Cookies',
    ingredients:
      '2 cups all-purpose flour\n1 cup butter, softened\n3/4 cup brown sugar\n1/2 cup white sugar\n2 large eggs\n2 tsp vanilla extract\n1 tsp baking soda\n1 tsp salt\n2 cups chocolate chips',
    instructions:
      'Preheat oven to 375°F. Mix butter and sugars until creamy. Beat in eggs and vanilla. Combine dry ingredients and mix into butter mixture. Stir in chocolate chips. Drop rounded tablespoons onto ungreased cookie sheets. Bake 9-11 minutes until golden brown.',
    cookTime: '25 minutes',
  },
  {
    name: 'Simple Pasta Carbonara',
    ingredients:
      '400g spaghetti\n200g pancetta or bacon\n4 large eggs\n100g Parmesan cheese, grated\n2 cloves garlic, minced\nSalt and black pepper\n2 tbsp olive oil',
    instructions:
      'Cook pasta according to package directions. Meanwhile, cook pancetta until crispy. Whisk eggs with Parmesan, salt, and pepper. Drain pasta, reserving 1 cup pasta water. Quickly toss hot pasta with egg mixture and pancetta. Add pasta water as needed for creamy consistency.',
    cookTime: '20 minutes',
  },
];

const usePostgres =
  !process.env.DATABASE_PATH &&
  (process.env.DB_CLIENT === 'postgres' ||
    Boolean(process.env.DATABASE_URL) ||
    Boolean(process.env.PGHOST));

function normalizeParams(paramsOrCallback, maybeCallback) {
  if (typeof paramsOrCallback === 'function') {
    return { params: [], callback: paramsOrCallback };
  }
  return { params: paramsOrCallback || [], callback: maybeCallback };
}

function convertSqlPlaceholders(sql) {
  let parameterIndex = 0;
  return sql.replace(/\?/g, () => `$${++parameterIndex}`);
}

function maybeAddReturningId(sql) {
  if (!/^\s*insert\s+into\s+recipes\b/i.test(sql) || /\breturning\b/i.test(sql)) {
    return sql;
  }
  return `${sql} RETURNING id`;
}

if (usePostgres) {
  const pool = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : undefined
  );

  const initializeDatabase = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        instructions TEXT NOT NULL,
        "cookTime" TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM recipes');
    if (rows[0]?.count === 0) {
      await pool.query(
        `INSERT INTO recipes (name, ingredients, instructions, "cookTime")
         VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
        [
          sampleRecipes[0].name,
          sampleRecipes[0].ingredients,
          sampleRecipes[0].instructions,
          sampleRecipes[0].cookTime,
          sampleRecipes[1].name,
          sampleRecipes[1].ingredients,
          sampleRecipes[1].instructions,
          sampleRecipes[1].cookTime,
        ]
      );
    }
  };

  const ready = initializeDatabase().catch((error) => {
    console.error('Error initializing PostgreSQL database:', error);
    throw error;
  });

  const query = async (sql, params = []) => {
    await ready;
    return pool.query(convertSqlPlaceholders(sql), params);
  };

  module.exports = {
    query: async (sql, params = []) => {
      const result = await query(sql, params);
      return result;
    },
    all(sql, paramsOrCallback, maybeCallback) {
      const { params, callback } = normalizeParams(paramsOrCallback, maybeCallback);
      query(sql, params)
        .then((result) => callback(null, result.rows))
        .catch((error) => callback(error));
    },
    get(sql, paramsOrCallback, maybeCallback) {
      const { params, callback } = normalizeParams(paramsOrCallback, maybeCallback);
      query(sql, params)
        .then((result) => callback(null, result.rows[0]))
        .catch((error) => callback(error));
    },
    run(sql, paramsOrCallback, maybeCallback) {
      const { params, callback } = normalizeParams(paramsOrCallback, maybeCallback);
      query(maybeAddReturningId(sql), params)
        .then((result) => {
          callback.call(
            {
              changes: result.rowCount || 0,
              lastID: result.rows?.[0]?.id,
            },
            null
          );
        })
        .catch((error) => callback(error));
    },
    close(callback) {
      pool
        .end()
        .then(() => callback(null))
        .catch((error) => callback(error));
    },
  };
} else {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'recipes.db');
  const sqliteDb = new sqlite3.Database(dbPath);

  const initializeDatabase = () =>
    new Promise((resolve, reject) => {
      sqliteDb.serialize(() => {
        sqliteDb.run(
          `
            CREATE TABLE IF NOT EXISTS recipes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              ingredients TEXT NOT NULL,
              instructions TEXT NOT NULL,
              "cookTime" TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `,
          (tableError) => {
            if (tableError) {
              reject(tableError);
              return;
            }

            sqliteDb.get('SELECT COUNT(*) AS count FROM recipes', (countError, row) => {
              if (countError) {
                reject(countError);
                return;
              }

              if (row.count === 0) {
                const statement = sqliteDb.prepare(
                  'INSERT INTO recipes (name, ingredients, instructions, "cookTime") VALUES (?, ?, ?, ?)'
                );
                for (const recipe of sampleRecipes) {
                  statement.run(
                    recipe.name,
                    recipe.ingredients,
                    recipe.instructions,
                    recipe.cookTime
                  );
                }
                statement.finalize((finalizeError) => {
                  if (finalizeError) reject(finalizeError);
                  else resolve();
                });
                return;
              }

              resolve();
            });
          }
        );
      });
    });

  const ready = initializeDatabase().catch((error) => {
    console.error('Error initializing SQLite database:', error);
    throw error;
  });

  module.exports = {
    query(sql, params = []) {
      return ready.then(
        () =>
          new Promise((resolve, reject) => {
            sqliteDb.all(sql, params, (error, rows) => {
              if (error) reject(error);
              else resolve({ rows });
            });
          })
      );
    },
    all(sql, paramsOrCallback, maybeCallback) {
      const { params, callback } = normalizeParams(paramsOrCallback, maybeCallback);
      ready
        .then(() => sqliteDb.all(sql, params, callback))
        .catch((error) => callback(error));
    },
    get(sql, paramsOrCallback, maybeCallback) {
      const { params, callback } = normalizeParams(paramsOrCallback, maybeCallback);
      ready
        .then(() => sqliteDb.get(sql, params, callback))
        .catch((error) => callback(error));
    },
    run(sql, paramsOrCallback, maybeCallback) {
      const { params, callback } = normalizeParams(paramsOrCallback, maybeCallback);
      ready
        .then(
          () =>
            new Promise((resolve, reject) => {
              sqliteDb.run(sql, params, function onRun(error) {
                if (error) reject(error);
                else resolve(this);
              });
            })
        )
        .then((context) => callback.call(context, null))
        .catch((error) => callback(error));
    },
    close(callback) {
      sqliteDb.close(callback);
    },
  };
}