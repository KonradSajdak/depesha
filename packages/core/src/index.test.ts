import { test, expect } from 'vitest'
import createWelcomeMessage from './index'

test('welcome', () => {
  const welcome = createWelcomeMessage()

  expect(welcome).toBe('Hello World!')
})