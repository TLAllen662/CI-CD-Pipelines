import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'

const initialRecipe = {
  id: 1,
  name: 'Tomato Soup',
  ingredients: 'Tomatoes\nWater',
  instructions: 'Simmer until soft.',
  cookTime: '30 minutes',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('loads and displays recipes', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [initialRecipe],
    })
  )

  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Tomato Soup' })).toBeInTheDocument()
  expect(screen.getByText(/30 minutes/)).toBeInTheDocument()
  expect(screen.getByText('Tomatoes')).toBeInTheDocument()
})

test('submits a new recipe and refreshes the list', async () => {
  const user = userEvent.setup()
  const addedRecipe = { ...initialRecipe, id: 2, name: 'Pasta' }
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: true, json: async () => addedRecipe })
    .mockResolvedValueOnce({ ok: true, json: async () => [addedRecipe] })
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)

  await screen.findByText(/No recipes yet/)
  await user.type(screen.getByPlaceholderText('Recipe Name'), 'Pasta')
  await user.type(
    screen.getByPlaceholderText('Cook Time (e.g., 30 minutes)'),
    '20 minutes'
  )
  await user.type(
    screen.getByPlaceholderText('Ingredients (one per line)'),
    'Pasta\nTomatoes'
  )
  await user.type(
    screen.getByPlaceholderText('Cooking Instructions'),
    'Boil and serve.'
  )
  await user.click(screen.getByRole('button', { name: 'Add Recipe' }))

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
  expect(await screen.findByRole('heading', { name: 'Pasta' })).toBeInTheDocument()
  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    name: 'Pasta',
    cookTime: '20 minutes',
    ingredients: 'Pasta\nTomatoes',
    instructions: 'Boil and serve.',
  })
})
