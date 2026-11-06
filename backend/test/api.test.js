const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');
const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();

const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'recipe-api-test-'));
const databasePath = path.join(databaseDirectory, 'recipes.db');

let db;
let app;

function runDatabaseQuery(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

before(async () => {
  await new Promise((resolve, reject) => {
    const setupDatabase = new sqlite3.Database(databasePath, (error) => {
      if (error) {
        reject(error);
        return;
      }

      setupDatabase.exec(
        `CREATE TABLE recipes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          ingredients TEXT NOT NULL,
          instructions TEXT NOT NULL,
          cookTime TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO recipes (name, ingredients, instructions, cookTime)
        VALUES ('Test fixture', 'Ingredient', 'Instruction', '1 minute');`,
        (setupError) => {
          setupDatabase.close((closeError) => {
            if (setupError) reject(setupError);
            else if (closeError) reject(closeError);
            else resolve();
          });
        }
      );
    });
  });

  process.env.DATABASE_PATH = databasePath;
  db = require('../database');
  app = require('../server');
});

beforeEach(async () => {
  await runDatabaseQuery('DELETE FROM recipes');
});

after(async () => {
  await new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  rmSync(databaseDirectory, { recursive: true, force: true });
});

test('GET /api/recipes returns the recipes', async () => {
  await runDatabaseQuery(
    "INSERT INTO recipes (name, ingredients, instructions, cookTime) VALUES ('Soup', 'Water', 'Boil', '10 minutes')"
  );

  const response = await request(app).get('/api/recipes');

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].name, 'Soup');
});

test('POST /api/recipes creates a recipe', async () => {
  const recipe = {
    name: 'Pancakes',
    ingredients: 'Flour\nMilk\nEgg',
    instructions: 'Mix and cook.',
    cookTime: '15 minutes',
  };

  const response = await request(app).post('/api/recipes').send(recipe);

  assert.equal(response.status, 201);
  assert.equal(response.body.name, recipe.name);
  assert.equal(response.body.ingredients, recipe.ingredients);
  assert.ok(response.body.id);
});

test('POST /api/recipes rejects missing fields', async () => {
  const response = await request(app)
    .post('/api/recipes')
    .send({ name: 'Incomplete' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'All fields are required');
});

test('GET /api/recipes/:id returns 404 for an unknown recipe', async () => {
  const response = await request(app).get('/api/recipes/999999');

  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Recipe not found');
});

test('DELETE /api/recipes/:id deletes an existing recipe', async () => {
  const created = await request(app).post('/api/recipes').send({
    name: 'Toast',
    ingredients: 'Bread',
    instructions: 'Toast it.',
    cookTime: '5 minutes',
  });

  const response = await request(app).delete(
    `/api/recipes/${created.body.id}`
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Recipe deleted successfully');
});

test('GET /api/health reports a healthy status', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'healthy');
  assert.ok(response.body.timestamp);
});

test('intentional CI deployment gate demonstration', () => {
  assert.fail('Intentional failure: verify that CI skips deployment');
});
