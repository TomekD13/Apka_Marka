import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './App'
import { initFontScale } from './lib/fontScale'
import './index.css'

// wybrana wielkosc tekstu ma dzialac od pierwszego renderu, nie dopiero
// po wejsciu na strone z przelacznikiem
initFontScale()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
