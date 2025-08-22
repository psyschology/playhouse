// Import the functions you need from the SDKs - Use consistent version 11.0.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  get,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCp7EfhVsUiqfeS5PATugITeTCGtcJhR1U",
  authDomain: "flower-based.firebaseapp.com",
  databaseURL: "https://flower-based-default-rtdb.firebaseio.com",
  projectId: "flower-based",
  storageBucket: "flower-based.firebasestorage.app",
  messagingSenderId: "642271618372",
  appId: "1:642271618372:web:906af32f5b2ec8626ba311",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);


// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", function () {
  // Hide main content until the announcement is accepted
  const announcementPopup = document.getElementById("announcement-popup");
  const mainContent = document.getElementById("main-content");
  const acceptButton = document.getElementById("accept-button");

  if (acceptButton) {
    acceptButton.addEventListener("click", () => {
      announcementPopup.style.display = "none";
      mainContent.style.display = "block";
    });
  }


  // Search bar functionality
  const searchBar = document.getElementById("ticketSearchBar");
  const ticketsContainer = document.getElementById("tickets");

  if (searchBar && ticketsContainer) {
    searchBar.addEventListener("input", function () {
      const searchText = searchBar.value.toLowerCase();
      const tickets = ticketsContainer.getElementsByClassName("dynamic-ticket");

      Array.from(tickets).forEach((ticket) => {
        const ticketText = ticket.textContent.toLowerCase();
        if (ticketText.includes(searchText)) {
          ticket.style.display = "";
        } else {
          ticket.style.display = "none";
        }
      });
    });
  }
});

// Elements
const gameBoard = document.getElementById("gameBoard");
const nextGameTime = document.getElementById("nextGameTime");
const nextGameDate = document.getElementById("nextGameDate");
const timeLeft = document.getElementById("timeLeft");
const ticketsContainer = document.getElementById("tickets");
const calledNumbersContainer = document.getElementById("calledNumbers");
const calledNumbersTableContainer =
  document.getElementById("calledNumbersTable");

let calledNumbers = [];
let intervalId = null;
let numberPool = [];

// Initialize the number pool
function initializeNumberPool() {
  numberPool = Array.from({ length: 90 }, (_, i) => i + 1).sort(
    () => Math.random() - 0.5
  );
}

// Update UI based on game state
onValue(ref(database, "gameInfo"), (snapshot) => {
  const gameInfo = snapshot.val();

  if (gameInfo) {
    if (nextGameTime)
      nextGameTime.textContent = `Next Game Time: ${
        gameInfo.gameTime || "N/A"
      }`;
    if (nextGameDate)
      nextGameDate.textContent = `Next Game Date: ${
        gameInfo.gameDate || "N/A"
      }`;

    if (gameInfo.gameTime && gameInfo.gameDate) {
      const gameDateTime = new Date(
        `${gameInfo.gameDate}T${gameInfo.gameTime}`
      );

      if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
      }

      window.countdownInterval = setInterval(() => {
        const now = new Date();
        const timeDiff = gameDateTime - now;

        if (timeDiff > 0) {
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor(
            (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

          if (timeLeft)
            timeLeft.textContent = `Time Left: ${hours}h ${minutes}m ${seconds}s`;
        } else {
          clearInterval(window.countdownInterval);
          if (timeLeft) timeLeft.textContent = "Time Left: 0h 0m 0s";
        }
      }, 1000);
    } else {
      if (timeLeft) timeLeft.textContent = "Time Left: N/A";
    }
  } else {
    if (nextGameTime) nextGameTime.textContent = "Next Game Time: N/A";
    if (nextGameDate) nextGameDate.textContent = "Next Game Date: N/A";
    if (timeLeft) timeLeft.textContent = "Time Left: N/A";
  }
});

// Listen for changes in game status
onValue(ref(database, "gameInfo/status"), (snapshot) => {
  const status = snapshot.val();
  const ticketStatusMessage = document.getElementById("ticketStatusMessage");
  const calledNumbersTableHeading = document.getElementById(
    "calledNumbersTableHeading"
  );

  if (status === "started") {
    if (ticketStatusMessage) {
      ticketStatusMessage.textContent = "Game is Live";
      ticketStatusMessage.style.color = "green";
    }
    if (calledNumbersTableHeading) {
      calledNumbersTableHeading.style.display = "block";
    }
    initializeNumberPool();
    onValue(ref(database, "gameInfo/board"), (snapshot) => {
      const board = snapshot.val();
      if (board && gameBoard) {
        gameBoard.style.display = "block";
        generateBoard(board);
        startNumberCalling();
      }
    });
  } else if (status === "ended") {
    if (gameBoard) gameBoard.style.display = "none";
    stopNumberCalling();
    if (ticketStatusMessage) {
      ticketStatusMessage.textContent = "Check Available Ticket";
      ticketStatusMessage.style.color = "red";
    }
    if (calledNumbersTableHeading) {
      calledNumbersTableHeading.style.display = "none";
    }
  }
});

onValue(ref(database, "calledNumbers"), (snapshot) => {
  const numbers = snapshot.val() || [];
  calledNumbers = numbers;
  updateCalledNumbersTable();

  if (calledNumbersContainer) {
    calledNumbersContainer.innerHTML = numbers
      .map((number) => `<span class="called-number">${number}</span>`)
      .join(" ");
  }

  numbers.forEach((number) => {
    const cell = document.getElementById(`cell-${number}`);
    if (cell) {
      cell.classList.add("called");
      cell.style.backgroundColor = "yellow";
    }
  });

  updateTicketsWithCalledNumbers();
});

// Fetch the tickets and render them
onValue(ref(database, "tickets"), (snapshot) => {
  const tickets = snapshot.val();
  if (ticketsContainer) {
    ticketsContainer.innerHTML = "";

    if (tickets) {
      for (const [ticketNumber, ticket] of Object.entries(tickets)) {
        if (ticketNumber !== "limit") {
          const ticketDiv = document.createElement("div");
          ticketDiv.className = "dynamic-ticket";
          ticketDiv.innerHTML = `
                    <div class="ticket-header">Ticket ${ticketNumber}</div>
                    <div class="ticket-owner">
                        ${
                          ticket.bookedBy
                            ? `Booked by: ${ticket.bookedBy}`
                            : `<a href="https://wa.me/99999" target="_blank">Book Now</a>`
                        }
                    </div>
                    <div id="ticket-${ticketNumber}" class="ticket-grid"></div>
                `;
          ticketsContainer.appendChild(ticketDiv);

          const ticketGrid = document.getElementById(`ticket-${ticketNumber}`);
          const table = document.createElement("table");
          table.className = "ticket-table";

          for (let i = 0; i < 3; i++) {
            const tr = document.createElement("tr");
            for (let j = 0; j < 9; j++) {
              const td = document.createElement("td");
              const number = ticket.numbers[i * 9 + j];

              if (number !== null) {
                td.className = "filled";
                td.textContent = number;
                if (calledNumbers.includes(number)) {
                  td.classList.add("called");
                  td.style.backgroundColor = "yellow";
                }
              } else {
                td.className = "blocked";
              }

              tr.appendChild(td);
            }
            table.appendChild(tr);
          }
          if (ticketGrid) ticketGrid.appendChild(table);
        }
      }
    }
  }
});

function generateBoard(board) {
  const table = document.createElement("table");
  for (let i = 0; i < 9; i++) {
    const tr = document.createElement("tr");
    for (let j = 0; j < 10; j++) {
      const td = document.createElement("td");
      const num = board[i * 10 + j];
      td.textContent = num;
      td.id = `cell-${num}`;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  if (gameBoard) {
    gameBoard.innerHTML = "";
    gameBoard.appendChild(table);
  }
}

function startNumberCalling() {
  intervalId = setInterval(() => {
    if (numberPool.length > 0) {
      const number = numberPool.shift();
      updateCalledNumbers(number);
      announceNumber(number);
    } else {
      stopNumberCalling();
    }
  }, 2000);
}

function stopNumberCalling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function updateCalledNumbers(number) {
  calledNumbers.push(number);
  set(ref(database, "calledNumbers"), calledNumbers);
  const container = document.getElementById(`cell-${number}`);
  if (container) {
    container.classList.add("called");
    container.style.backgroundColor = "yellow";
  }
  updateTicketsWithCalledNumbers();
  updateCalledNumbersTable();
}

function updateCalledNumbersTable() {
  if (!calledNumbersTableContainer) return;

  const table = document.createElement("table");
  table.className = "called-numbers-table";

  let row = document.createElement("tr");
  table.appendChild(row);

  calledNumbers.forEach((number, index) => {
    if (index % 22 === 0 && index !== 0) {
      row = document.createElement("tr");
      table.appendChild(row);
    }
    const cell = document.createElement("td");
    cell.textContent = number;
    cell.className = "called";
    row.appendChild(cell);
  });

  const totalCells = Math.ceil(calledNumbers.length / 22) * 22;
  const emptyCells = totalCells - calledNumbers.length;
  for (let i = 0; i < emptyCells; i++) {
    const cell = document.createElement("td");
    cell.className = "empty";
    row.appendChild(cell);
  }

  calledNumbersTableContainer.innerHTML = "";
  calledNumbersTableContainer.appendChild(table);
}

function updateTicketsWithCalledNumbers() {
  const tickets = document.getElementsByClassName("ticket-table");
  Array.from(tickets).forEach((ticket) => {
    Array.from(ticket.getElementsByTagName("td")).forEach((cell) => {
      const number = parseInt(cell.textContent);
      if (calledNumbers.includes(number)) {
        cell.classList.add("called");
        cell.style.backgroundColor = "yellow";
      }
    });
  });
}

function announceNumber(number) {
  const msg = new SpeechSynthesisUtterance(number.toString());
  msg.lang = "en-IN";
  speechSynthesis.speak(msg);
}

// Awards functionality
function updateAwardDisplay() {
  const awardBox = document.getElementById("awardBox");
  if (!awardBox) return;

  const gameStatusRef = ref(database, "gameInfo/status");

  onValue(gameStatusRef, (snapshot) => {
    const gameStatus = snapshot.val();
    if (gameStatus === "started") {
      awardBox.style.display = "block";
      loadAwards();
      checkAwards();
    } else {
      awardBox.style.display = "none";
    }
  });
}

function loadAwards() {
  const awardBox = document.getElementById("awardBox");
  if (!awardBox) return;

  const awardsRef = ref(database, "gameInfo/awards");

  onValue(awardsRef, (snapshot) => {
    const awards = snapshot.val();
    if (!awards) return;

    awardBox.innerHTML = "";

    for (const [awardName, awardData] of Object.entries(awards)) {
      const awardContainer = document.createElement("div");
      awardContainer.className = "award-container";

      const awardTitle = document.createElement("div");
      awardTitle.className = "award-name";
      awardTitle.textContent = awardName;

      const winnerDetails = document.createElement("div");
      winnerDetails.className = "winner-details";

      awardContainer.appendChild(awardTitle);
      awardContainer.appendChild(winnerDetails);
      awardBox.appendChild(awardContainer);
    }
  });
}

function checkAwards() {
  const awardsRef = ref(database, "gameInfo/awards");
  const calledNumbersRef = ref(database, "calledNumbers");
  const ticketsRef = ref(database, "tickets");

  onValue(calledNumbersRef, (snapshot) => {
    const calledNumbers = snapshot.val() || [];

    onValue(ticketsRef, (snapshot) => {
      const tickets = snapshot.val();
      if (!tickets) return;

      const awards = {};
      onValue(awardsRef, (snapshot) => {
        const awardsData = snapshot.val();
        if (!awardsData) return;

        for (const [awardName, awardData] of Object.entries(awardsData)) {
          awards[awardName] = {
            ...awardData,
            winner: null,
          };
        }

        for (const [ticketNumber, ticket] of Object.entries(tickets)) {
          if (ticketNumber === "limit") continue;

          const ticketNumbers = ticket.numbers;
          const winningAwards = checkTicketAwards(ticketNumbers, calledNumbers);
          winningAwards.forEach((award) => {
            if (!awards[award] || !awards[award].winner) {
              if (awards[award]) {
                awards[award].winner = {
                  ticketNumber: ticketNumber,
                  owner: ticket.bookedBy || "Unknown",
                  ticketGrid: ticket.numbers,
                };
              }
            }
          });
        }

        updateAwardsInDisplay(awards);
      });
    });
  });
}

function checkTicketAwards(ticketNumbers, calledNumbers) {
  const awards = [];
  if (checkFullHouse(ticketNumbers, calledNumbers)) awards.push("Full House");
  if (checkLine(ticketNumbers, calledNumbers, "top")) awards.push("Top Line");
  if (checkLine(ticketNumbers, calledNumbers, "middle"))
    awards.push("Middle Line");
  if (checkLine(ticketNumbers, calledNumbers, "bottom"))
    awards.push("Bottom Line");
  if (checkFourCorners(ticketNumbers, calledNumbers))
    awards.push("Four Corners");
  if (checkEarlyFive(ticketNumbers, calledNumbers)) awards.push("Early Five");
  return awards;
}

function updateAwardsInDisplay(awards) {
  const awardBox = document.getElementById("awardBox");
  if (!awardBox) return;

  awardBox.querySelectorAll(".award-container").forEach((container) => {
    const awardTitle = container.querySelector(".award-name").textContent;
    const winnerDetails = container.querySelector(".winner-details");
    const awardData = awards[awardTitle];

    if (awardData && awardData.winner) {
      winnerDetails.innerHTML = `
                <p>Ticket Number: ${awardData.winner.ticketNumber}</p>
                <p>Owner: ${awardData.winner.owner}</p>
                <p>Numbers: ${awardData.winner.ticketGrid
                  .filter((n) => n !== null)
                  .join(", ")}</p>
            `;
    } else {
      winnerDetails.innerHTML =
        '<p class="no-winner-message">No winners yet</p>';
    }
  });
}

// Helper functions for awards
function checkFullHouse(ticketNumbers, calledNumbers) {
  const nonNullNumbers = ticketNumbers.filter((num) => num !== null);
  return nonNullNumbers.every((number) => calledNumbers.includes(number));
}

function checkLine(ticketNumbers, calledNumbers, lineType) {
  const lines = {
    top: ticketNumbers.slice(0, 9),
    middle: ticketNumbers.slice(9, 18),
    bottom: ticketNumbers.slice(18, 27),
  };
  const lineNumbers = lines[lineType].filter((num) => num !== null);
  return (
    lineNumbers.length > 0 &&
    lineNumbers.every((number) => calledNumbers.includes(number))
  );
}

function checkFourCorners(ticketNumbers, calledNumbers) {
  const corners = [
    ticketNumbers[0],
    ticketNumbers[2],
    ticketNumbers,
    ticketNumbers,
  ].filter((num) => num !== null);
  return (
    corners.length === 4 &&
    corners.every((number) => calledNumbers.includes(number))
  );
}

function checkEarlyFive(ticketNumbers, calledNumbers) {
  const markedNumbers = ticketNumbers.filter(
    (number) => number !== null && calledNumbers.includes(number)
  );
  return markedNumbers.length >= 5;
}

// Initialize award display
updateAwardDisplay();

// Search functionality
const ticketSearchBar = document.getElementById("ticketSearchBar");

function renderTickets(tickets) {
  const ticketsContainer = document.getElementById("tickets");
  if (!ticketsContainer) return;

  ticketsContainer.innerHTML = "";

  for (const [ticketNumber, ticket] of Object.entries(tickets)) {
    if (ticketNumber !== "limit") {
      const ticketDiv = document.createElement("div");
      ticketDiv.className = "dynamic-ticket";
      ticketDiv.innerHTML = `
                <div class="ticket-header">Ticket ${ticketNumber}</div>
                <div class="ticket-owner">
                    ${
                      ticket.bookedBy
                        ? `Booked by: ${ticket.bookedBy}`
                        : `<a href="https://wa.me/99999" target="_blank">Book Now</a>`
                    }
                </div>
                <div id="ticket-${ticketNumber}" class="ticket-grid"></div>
            `;
      ticketsContainer.appendChild(ticketDiv);

      const ticketGrid = document.getElementById(`ticket-${ticketNumber}`);
      const table = document.createElement("table");
      table.className = "ticket-table";

      for (let i = 0; i < 3; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < 9; j++) {
          const index = i * 9 + j;
          const td = document.createElement("td");

          if (ticket.numbers[index] !== null) {
            td.className = "filled";
            td.textContent = ticket.numbers[index];
          } else {
            td.className = "blocked";
          }

          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
      if (ticketGrid) ticketGrid.appendChild(table);
    }
  }
}

function filterTickets(query) {
  get(ref(database, "tickets")).then((snapshot) => {
    const tickets = snapshot.val();
    if (tickets) {
      const filteredTickets = {};
      for (const [ticketNumber, ticket] of Object.entries(tickets)) {
        if (
          ticketNumber.includes(query) ||
          (ticket.bookedBy &&
            ticket.bookedBy.toLowerCase().includes(query.toLowerCase()))
        ) {
          filteredTickets[ticketNumber] = ticket;
        }
      }
      renderTickets(filteredTickets);
    }
  });
}

if (ticketSearchBar) {
  ticketSearchBar.addEventListener("input", (e) => {
    const query = e.target.value;
    if (query) {
      filterTickets(query);
    } else {
      // Show all tickets when search is empty
      get(ref(database, "tickets")).then((snapshot) => {
        const tickets = snapshot.val();
        if (tickets) {
          renderTickets(tickets);
        }
      });
    }
  });
}
