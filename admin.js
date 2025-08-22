// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getDatabase, ref, set, update } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

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
const auth = getAuth(app);

// Elements
const startGameButton = document.getElementById('startGame');
const endGameButton = document.getElementById('endGame');
const setGameTimeButton = document.getElementById('setGameTime');
const setTicketLimitButton = document.getElementById('setTicketLimit');
const bookTicketButton = document.getElementById('bookTicket');

// Reference to the ticket status message element
const ticketStatusMessage = document.getElementById('ticketStatusMessage');

// Function to update the ticket status message
function updateTicketStatusMessage(status) {
    if (status === 'started') {
        ticketStatusMessage.textContent = 'Game is live';
    } else if (status === 'ended') {
        ticketStatusMessage.textContent = 'Game has ended';
    } else {
        ticketStatusMessage.textContent = 'Check Available Ticket';
    }
}

// Prompt for email and password on page load
document.addEventListener('DOMContentLoaded', () => {
    const email = prompt('Enter your email:');
    const password = prompt('Enter your password:');
    
    if (email && password) {
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // User signed in successfully
                const user = userCredential.user;
                console.log('User signed in:', user.email);
            })
            .catch((error) => {
                // Authentication failed
                alert('Incorrect email or password');
                window.location.href = 'about:blank'; // Redirect to a blank page if authentication fails
            });
    } else {
        alert('Please enter both email and password');
        window.location.href = 'about:blank'; // Redirect to a blank page if email or password is missing
    }
});
startGameButton.addEventListener('click', () => {
    set(ref(database, 'gameInfo/status'), 'started');
    set(ref(database, 'gameInfo/board'), generateBoardNumbers());
      updateTicketStatusMessage('started'); // Update message when game starts
});

endGameButton.addEventListener('click', () => {
    set(ref(database, 'gameInfo/status'), 'ended');
    set(ref(database, 'gameInfo/board'), null); // Clear the board
    set(ref(database, 'calledNumbers'), []);
      updateTicketStatusMessage('ended'); // Update message when game ends
});

// Function to monitor game status and update message in real-time
const gameStatusRef = ref(database, 'gameInfo/status');
onValue(gameStatusRef, (snapshot) => {
    const status = snapshot.val();
    updateTicketStatusMessage(status); // Update message based on current status
});

setGameTimeButton.addEventListener('click', () => {
    // Create a container for the date and time input elements
    const inputContainer = document.createElement('div');

    // Create a datetime-local input for selecting the game start time
    const dateTimeInput = document.createElement('input');
    dateTimeInput.type = 'datetime-local';
    dateTimeInput.id = 'gameDateTime';
    dateTimeInput.name = 'gameDateTime';

    // Create a submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Set Game Time';

    // Append the input and button to the container
    inputContainer.appendChild(dateTimeInput);
    inputContainer.appendChild(submitButton);

    // Append the container to the body or a specific part of the page
    document.body.appendChild(inputContainer);

    // Handle the click event on the submit button
    submitButton.addEventListener('click', () => {
        const selectedDateTime = dateTimeInput.value;

        if (selectedDateTime) {
            const [gameDate, gameTime] = selectedDateTime.split('T');

            // Update the game info in the database
            update(ref(database, 'gameInfo'), {
                gameTime: gameTime + ':00Z', // Adding seconds and timezone format
                gameDate: gameDate
            }).then(() => {
                alert('Game time and date set successfully!');
                document.body.removeChild(inputContainer); // Remove the input elements after setting the time
            }).catch(error => {
                alert('Error setting game time and date:', error);
            });
        } else {
            alert('Please select a valid date and time.');
        }
    });
});


setTicketLimitButton.addEventListener('click', () => {
    const limit = prompt("Enter the number of tickets:");
    if (limit) {
        const tickets = {};

        function generateTicket() {
            const ticketNumbers = Array(27).fill(null); // 3 rows x 9 columns = 27 cells
            const columnsArray = Array.from({ length: 9 }, () => []);

            // Populate columns with numbers in ascending order
            for (let col = 0; col < 9; col++) {
                const min = col * 10 + 1;
                const max = col === 8 ? 90 : (col + 1) * 10;

                for (let num = min; num <= max; num++) {
                    columnsArray[col].push(num);
                }
                columnsArray[col].sort((a, b) => a - b); // Ensure ascending order
            }

            // Assign numbers to the ticket ensuring 5 per row
            for (let row = 0; row < 3; row++) {
                const selectedColumns = new Set();

                while (selectedColumns.size < 5) {
                    const col = Math.floor(Math.random() * 9);
                    selectedColumns.add(col);
                }

                selectedColumns.forEach(col => {
                    const number = columnsArray[col].shift(); // Get the smallest number in ascending order
                    ticketNumbers[row * 9 + col] = number;
                });
            }

            return { numbers: ticketNumbers };
        }

        // Generate tickets based on the specified limit
        for (let i = 1; i <= limit; i++) {
            tickets[i] = generateTicket();
        }

        // Store the tickets in Firebase
        set(ref(database, 'tickets'), tickets);
    }
});




bookTicketButton.addEventListener('click', () => {
    const ticketNumber = prompt("Enter the ticket number to book:");
    const ownerName = prompt("Enter the owner's name:");
    if (ticketNumber && ownerName) {
        update(ref(database, `tickets/${ticketNumber}`), {
            bookedBy: ownerName
        });
    }
});

function generateBoardNumbers() {
    const board = Array.from({ length: 90 }, (_, i) => i + 1);
    return board;
}



// Function to set awards in the Firebase database
document.getElementById('setAwardsButton').addEventListener('click', () => {
    const awards = {
        'Full House': {
            amount: document.getElementById('fullHouseAmount').value,
            winner: null
        },
        'Top Line': {
            amount: document.getElementById('topLineAmount').value,
            winner: null
        },
        'Middle Line': {
            amount: document.getElementById('middleLineAmount').value,
            winner: null
        },
        'Bottom Line': {
            amount: document.getElementById('bottomLineAmount').value,
            winner: null
        },
        'Four Corners': {
            amount: document.getElementById('fourCornersAmount').value,
            winner: null
        },
        'Early Five': {
            amount: document.getElementById('earlyFiveAmount').value,
            winner: null
        },
        'Odd-Even': {
            amount: document.getElementById('oddEvenAmount').value,
            winner: null
        },
        'Diagonal': {
            amount: document.getElementById('diagonalAmount').value,
            winner: null
        }
    };

    set(ref(database, 'gameInfo/awards'), awards)
        .then(() => alert('Awards set successfully!'))
        .catch(error => console.error('Error setting awards:', error));
});

// Function to update award display based on game status
function updateAwardDisplay() {
    const awardBox = document.getElementById('awardBox');
    const gameStatusRef = ref(database, 'gameInfo/status'); // Check game status

    onValue(gameStatusRef, (snapshot) => {
        const gameStatus = snapshot.val();
        if (gameStatus === 'started') {
            awardBox.style.display = 'block'; // Show awards if game is running
            loadAwards(); // Load and display awards if the game is running
            checkAwards(); // Start checking awards in real-time
        } else {
            awardBox.style.display = 'none'; // Hide awards otherwise
        }
    });
}

// Function to load and display awards
function loadAwards() {
    const awardBox = document.getElementById('awardBox');
    const awardsRef = ref(database, 'gameInfo/awards'); // Correct path to awards data in Firebase

    onValue(awardsRef, (snapshot) => {
        const awards = snapshot.val();
        awardBox.innerHTML = ''; // Clear previous awards
        
        for (const [awardName, awardData] of Object.entries(awards)) {
            const awardContainer = document.createElement('div');
            awardContainer.className = 'award-container';

            const awardTitle = document.createElement('div');
            awardTitle.className = 'award-name';
            awardTitle.textContent = awardName;

            const viewWinnerButton = document.createElement('button');
            viewWinnerButton.className = 'view-winner-button';
            viewWinnerButton.textContent = 'View Winner';
            viewWinnerButton.addEventListener('click', () => {
                const winnerDetails = awardContainer.querySelector('.winner-details');
                if (winnerDetails.style.display === 'none') {
                    winnerDetails.style.display = 'block';
                    updateWinnerDetails(winnerDetails, awardData);
                } else {
                    winnerDetails.style.display = 'none';
                }
            });

            const winnerDetails = document.createElement('div');
            winnerDetails.className = 'winner-details';
            winnerDetails.style.display = 'none'; // Hide by default

            awardContainer.appendChild(awardTitle);
            awardContainer.appendChild(viewWinnerButton);
            awardContainer.appendChild(winnerDetails);
            awardBox.appendChild(awardContainer);
        }
    });
}

// Function to check awards and update Firebase
function checkAwards() {
    const awardsRef = ref(database, 'gameInfo/awards');
    const calledNumbersRef = ref(database, 'calledNumbers');
    const ticketsRef = ref(database, 'tickets');

    onValue(calledNumbersRef, (snapshot) => {
        const calledNumbers = snapshot.val() || [];

        onValue(ticketsRef, (snapshot) => {
            const tickets = snapshot.val();
            const awards = {};
            onValue(awardsRef, (snapshot) => {
                const awardsData = snapshot.val();
                for (const [awardName, awardData] of Object.entries(awardsData)) {
                    awards[awardName] = {
                        ...awardData,
                        winner: null
                    };
                }

                for (const [ticketNumber, ticket] of Object.entries(tickets)) {
                    const ticketNumbers = ticket.numbers;
                    const winningAwards = checkTicketAwards(ticketNumbers, calledNumbers);
                    winningAwards.forEach((award) => {
                        if (awards[award] && !awards[award].winner) {
                            awards[award].winner = {
                                ticketNumber: ticketNumber,
                                owner: ticket.owner || 'Unknown',
                                ticketGrid: ticket.numbers
                            };
                            console.log(`Award '${award}' won by Ticket Number: ${ticketNumber}`); // Debugging line
                            set(ref(database, `gameInfo/awards/${award}`), awards[award]);
                        }
                    });
                }

                updateAwardsInDisplay(awards);
            });
        });
    });
}
// Function to update winner details
function updateWinnerDetails(winnerDetails, awardData) {
    if (awardData.winner) {
        winnerDetails.innerHTML = `
            <p>Ticket Number: ${awardData.winner.ticketNumber}</p>
            <p>Owner: ${awardData.winner.owner}</p>
            <p>Numbers: ${awardData.winner.ticketGrid.join(', ')}</p>
        `;
    } else {
        winnerDetails.innerHTML = '<p class="no-winner-message">No winners yet</p>';
    }
}

// Function to update awards in the display
function updateAwardsInDisplay(awards) {
    const awardBox = document.getElementById('awardBox');
    awardBox.querySelectorAll('.award-container').forEach(container => {
        const awardTitle = container.querySelector('.award-name').textContent;
        const winnerDetails = container.querySelector('.winner-details');
        const awardData = awards[awardTitle];

        if (awardData && awardData.winner) {
            winnerDetails.innerHTML = `
                <p>Ticket Number: ${awardData.winner.ticketNumber}</p>
                <p>Owner: ${awardData.winner.owner}</p>
                <p>Numbers: ${awardData.winner.ticketGrid.join(', ')}</p>
            `;
        } else {
            winnerDetails.innerHTML = '<p class="no-winner-message">No winners yet</p>';
        }
    });
}

// Helper functions (same as in user.js)
function checkFullHouse(ticketNumbers, calledNumbers) {
    return ticketNumbers.every(number => calledNumbers.includes(number));
}

function checkLine(ticketNumbers, calledNumbers, lineType) {
    const lines = {
        top: ticketNumbers.slice(0, 9),
        middle: ticketNumbers.slice(9, 18),
        bottom: ticketNumbers.slice(18, 27)
    };
    return lines[lineType].every(number => calledNumbers.includes(number));
}

function checkFourCorners(ticketNumbers, calledNumbers) {
    const corners = [
        ticketNumbers[0], // Top-left
        ticketNumbers[8], // Top-right
        ticketNumbers[18], // Bottom-left
        ticketNumbers[26] // Bottom-right
    ];
    return corners.every(number => calledNumbers.includes(number));
}

function checkEarlyFive(ticketNumbers, calledNumbers) {
    const markedNumbers = ticketNumbers.filter(number => calledNumbers.includes(number));
    return markedNumbers.length >= 5;
}

function checkOddEven(ticketNumbers, calledNumbers) {
    const oddNumbers = ticketNumbers.filter(number => number % 2 !== 0);
    const evenNumbers = ticketNumbers.filter(number => number % 2 === 0);
    const allOdd = oddNumbers.every(number => calledNumbers.includes(number));
    const allEven = evenNumbers.every(number => calledNumbers.includes(number));
    return allOdd || allEven;
}

function checkDiagonal(ticketNumbers, calledNumbers) {
    const diagonals = [
        [ticketNumbers[0], ticketNumbers[10], ticketNumbers[20]], // Top-left to bottom-right
        [ticketNumbers[8], ticketNumbers[16], ticketNumbers[24]] // Top-right to bottom-left
    ];
    return diagonals.some(diagonal => diagonal.every(number => calledNumbers.includes(number)));
}

updateAwardDisplay(); // Initialize display