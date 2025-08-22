import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js"
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js"

const firebaseConfig = {
  apiKey: "AIzaSyA2GqNgCMhUbUA__mOQVvG0mriD9yheDAA",
  authDomain: "housie-ed8d4.firebaseapp.com",
  databaseURL: "https://housie-ed8d4-default-rtdb.firebaseio.com",
  projectId: "housie-ed8d4",
  storageBucket: "housie-ed8d4.firebasestorage.app",
  messagingSenderId: "519240389248",
  appId: "1:519240389248:web:96a80677655df1eff54c65",
  measurementId: "G-63Y7DVS2SB",
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

let gameData = {}
let lastCalledNumber = null

// Initialize the game
function initializeGame() {
  createNumberBoard()
  setupFirebaseListeners()
}

// Create the 90-number board
function createNumberBoard() {
  const board = document.getElementById("numberBoard")
  board.innerHTML = ""

  for (let i = 1; i <= 90; i++) {
    const cell = document.createElement("div")
    cell.className = "number-cell"
    cell.textContent = i
    cell.id = `number-${i}`
    board.appendChild(cell)
  }
}

// Setup Firebase real-time listeners
function setupFirebaseListeners() {
  const gameRef = ref(db, "game")

  onValue(
    gameRef,
    (snapshot) => {
      const data = snapshot.val()
      console.log("[v0] Firebase data received:", data) // Debug log

      if (data) {
        gameData = data
        updateGameStatus()
        updateNumberBoard()
        updateCalledNumbers()
        updateTickets()
        updateAwards()
      } else {
        console.log("[v0] No game data found, showing default state")
        gameData = {
          status: "not_started",
          calledNumbers: [],
          tickets: {},
          awards: {},
          ticketCount: 100,
        }
        updateGameStatus()
        updateNumberBoard()
        updateCalledNumbers()
        updateTickets()
        updateAwards()
      }
    },
    (error) => {
      console.error("[v0] Firebase error:", error)
      const statusDiv = document.getElementById("gameStatus")
      statusDiv.innerHTML =
        '<h2 style="color: #dc3545;">Connection Error</h2><p>Unable to connect to game server. Please refresh the page.</p>'
    },
  )
}

// Update game status display
function updateGameStatus() {
  const statusDiv = document.getElementById("gameStatus")
  const gameBoard = document.getElementById("gameBoard")

  if (gameData.status === "running") {
    statusDiv.innerHTML = '<h2 style="color: #28a745;">🔴 Game is LIVE!</h2><p>Watch the numbers being called</p>'
    statusDiv.className = "game-status"
    gameBoard.style.display = "block"
  } else if (gameData.status === "ended") {
    const nextGame = gameData.nextGame ? new Date(gameData.nextGame).toLocaleString() : "TBA"
    statusDiv.innerHTML = `<h2 style="color: #dc3545;">Game Ended</h2><p>Next game starts at: <strong>${nextGame}</strong></p>`
    statusDiv.className = "game-status game-ended"
    gameBoard.style.display = "none"
  } else {
    statusDiv.innerHTML = "<h2>Game Not Started</h2><p>Please wait for the admin to start the game</p>"
    statusDiv.className = "game-status"
    gameBoard.style.display = "none"
  }
}

// Update number board with called numbers
function updateNumberBoard() {
  if (!gameData.calledNumbers) return

  // Reset all numbers
  for (let i = 1; i <= 90; i++) {
    const cell = document.getElementById(`number-${i}`)
    if (cell) {
      cell.classList.remove("called")
    }
  }

  // Mark called numbers
  gameData.calledNumbers.forEach((number) => {
    const cell = document.getElementById(`number-${number}`)
    if (cell) {
      cell.classList.add("called")
    }
  })

  // Check for new number and announce
  if (gameData.calledNumbers.length > 0) {
    const latestNumber = gameData.calledNumbers[gameData.calledNumbers.length - 1]
    if (latestNumber !== lastCalledNumber) {
      announceNumber(latestNumber)
      lastCalledNumber = latestNumber
    }
  }
}

// Update called numbers list
function updateCalledNumbers() {
  const calledList = document.getElementById("calledList")
  calledList.innerHTML = ""

  if (gameData.calledNumbers) {
    gameData.calledNumbers.forEach((number) => {
      const span = document.createElement("span")
      span.className = "called-number"
      span.textContent = number
      calledList.appendChild(span)
    })
  }
}

function generateTambolaTicket() {
  const ticket = Array(3)
    .fill()
    .map(() => Array(9).fill(null))

  // Generate numbers for each column with proper ranges
  const columnNumbers = []
  for (let col = 0; col < 9; col++) {
    const min = col === 0 ? 1 : col * 10
    const max = col === 8 ? 90 : (col + 1) * 10 - 1
    const colNums = []

    for (let i = min; i <= max; i++) {
      colNums.push(i)
    }
    columnNumbers[col] = colNums.sort(() => Math.random() - 0.5)
  }

  // Ensure each column has at least one number and no row has more than 5
  const numbersPerColumn = Array(9).fill(0)
  const numbersPerRow = Array(3).fill(0)

  // First pass: ensure each column has at least one number
  for (let col = 0; col < 9; col++) {
    const availableRows = [0, 1, 2].filter((row) => numbersPerRow[row] < 5)
    if (availableRows.length > 0) {
      const row = availableRows[Math.floor(Math.random() * availableRows.length)]
      ticket[row][col] = columnNumbers[col][numbersPerColumn[col]]
      numbersPerColumn[col]++
      numbersPerRow[row]++
    }
  }

  // Second pass: fill remaining spots up to 15 numbers total
  let totalNumbers = numbersPerRow.reduce((sum, count) => sum + count, 0)

  while (totalNumbers < 15) {
    const col = Math.floor(Math.random() * 9)
    const availableRows = [0, 1, 2].filter(
      (row) => numbersPerRow[row] < 5 && ticket[row][col] === null && numbersPerColumn[col] < columnNumbers[col].length,
    )

    if (availableRows.length > 0) {
      const row = availableRows[Math.floor(Math.random() * availableRows.length)]
      ticket[row][col] = columnNumbers[col][numbersPerColumn[col]]
      numbersPerColumn[col]++
      numbersPerRow[row]++
      totalNumbers++
    } else {
      break // Safety break if no valid spots
    }
  }

  // Sort numbers in each column in ascending order
  for (let col = 0; col < 9; col++) {
    const colNumbers = []
    for (let row = 0; row < 3; row++) {
      if (ticket[row][col] !== null) {
        colNumbers.push({ number: ticket[row][col], row })
      }
    }

    colNumbers.sort((a, b) => a.number - b.number)

    // Clear column
    for (let row = 0; row < 3; row++) {
      ticket[row][col] = null
    }

    // Place sorted numbers back
    colNumbers.forEach(({ number, row }) => {
      ticket[row][col] = number
    })
  }

  return ticket
}

function updateTickets() {
  const ticketsGrid = document.getElementById("ticketsGrid")
  ticketsGrid.innerHTML = ""

  const ticketCount = gameData.ticketCount || 100

  for (let i = 1; i <= ticketCount; i++) {
    const ticket = document.createElement("div")
    const ticketData = gameData.tickets && gameData.tickets[i]

    if (ticketData && ticketData.booked) {
      ticket.className = "ticket booked"
      const ticketNumbers = ticketData.numbers || generateTambolaTicket()

      ticket.innerHTML = `
        <div class="ticket-header">
          <div class="ticket-number">#${i}</div>
          <div class="ticket-status">Booked by ${ticketData.name}</div>
        </div>
        <div class="ticket-grid">
          ${ticketNumbers
            .map(
              (row) =>
                `<div class="ticket-row">
              ${row
                .map((num) => `<div class="ticket-cell ${num ? "has-number" : "empty"}">${num || ""}</div>`)
                .join("")}
            </div>`,
            )
            .join("")}
        </div>
      `
    } else {
      const sampleTicket = generateTambolaTicket()
      ticket.className = "ticket available"
      ticket.innerHTML = `
        <div class="ticket-header">
          <div class="ticket-number">#${i}</div>
          <div class="ticket-status">Available</div>
        </div>
        <div class="ticket-grid">
          ${sampleTicket
            .map(
              (row) =>
                `<div class="ticket-row">
              ${row
                .map((num) => `<div class="ticket-cell ${num ? "has-number" : "empty"}">${num || ""}</div>`)
                .join("")}
            </div>`,
            )
            .join("")}
        </div>
        <div class="book-now-btn" onclick="bookTicket(${i})">
          📱 Book Now via WhatsApp
        </div>
      `
    }

    ticketsGrid.appendChild(ticket)
  }
}

// Update awards display
function updateAwards() {
  const awardsGrid = document.getElementById("awardsGrid")
  awardsGrid.innerHTML = ""

  if (gameData.awards) {
    Object.entries(gameData.awards).forEach(([awardName, awardData]) => {
      const awardCard = document.createElement("div")
      awardCard.className = awardData.wonBy ? "award-card won" : "award-card"

      awardCard.innerHTML = `
                <div class="award-name">${awardName.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}</div>
                <div class="award-winner">
                    ${awardData.wonBy ? `Won by ${awardData.wonBy}` : "Not won yet"}
                </div>
            `

      awardsGrid.appendChild(awardCard)

      // Show winner popup for new winners
      if (awardData.wonBy && !awardData.announced) {
        showWinnerPopup(awardName, awardData.wonBy)
      }
    })
  }
}

// Book ticket via WhatsApp
function bookTicket(ticketNumber) {
  const message = `Hi! I would like to book Ticket #${ticketNumber} for the Tambola game.`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, "_blank")
}

function announceNumber(number) {
  if ("speechSynthesis" in window) {
    let announcement = ""

    // Convert number to proper Tambola calling format
    if (number <= 9) {
      const names = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
      announcement = `Number ${names[number]}, ${number}`
    } else if (number <= 90) {
      const tens = Math.floor(number / 10)
      const units = number % 10
      const tensNames = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
      const unitsNames = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]

      if (units === 0) {
        announcement = `${tensNames[tens]}, ${number}`
      } else {
        announcement = `${tensNames[tens]} ${unitsNames[units]}, ${number}`
      }
    }

    const utterance = new SpeechSynthesisUtterance(announcement)
    utterance.rate = 0.7
    utterance.pitch = 1.2
    utterance.volume = 0.9
    speechSynthesis.speak(utterance)
  }

  // Also play a notification sound
  playNotificationSound()
}

// Play notification sound
function playNotificationSound() {
  // Create a simple beep sound using Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (error) {
    console.log("Audio not supported")
  }
}

// Show winner popup
function showWinnerPopup(awardName, winner) {
  const popup = document.getElementById("winnerPopup")
  const overlay = document.getElementById("popupOverlay")
  const winnerText = document.getElementById("winnerText")

  winnerText.textContent = `${awardName.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} won by ${winner}!`

  overlay.style.display = "block"
  popup.style.display = "block"

  // Play celebration sound
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(`Congratulations! ${awardName} won by ${winner}!`)
    utterance.rate = 0.9
    utterance.pitch = 1.3
    speechSynthesis.speak(utterance)
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    overlay.style.display = "none"
    popup.style.display = "none"
  }, 5000)

  // Hide on click
  overlay.onclick = () => {
    overlay.style.display = "none"
    popup.style.display = "none"
  }
}

// Initialize the game when page loads
document.addEventListener("DOMContentLoaded", initializeGame)
