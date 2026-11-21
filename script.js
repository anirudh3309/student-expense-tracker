
// ======================================
// SPENDWISE - STUDENT EXPENSE TRACKER
// JavaScript Functionality
// ======================================

const STORAGE_KEY = "spendwise_transactions_v1";
const BUDGET_KEY = "spendwise_monthly_budget_v1";

let transactions = loadTransactions();
let expenseChart = null;

const elements = {
    balance: document.getElementById("totalBalance"),
    income: document.getElementById("totalIncome"),
    expense: document.getElementById("totalExpense"),
    transactionList: document.getElementById("transactionList"),
    transactionCount: document.getElementById("transactionCount"),
    transactionBadge: document.getElementById("transactionBadge"),
    monthlyBudget: document.getElementById("monthlyBudget"),
    remainingBalance: document.getElementById("remainingBalance"),
    budgetProgress: document.getElementById("budgetProgress"),
    budgetText: document.getElementById("budgetText"),
    modal: document.getElementById("transactionModal"),
    form: document.getElementById("transactionForm"),
    chart: document.getElementById("expenseChart")
};

// ======================================
// STORAGE
// ======================================

function loadTransactions() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(saved)) return [];

        return saved.filter(item =>
            item &&
            typeof item.id === "string" &&
            typeof item.description === "string" &&
            Number.isFinite(item.amount) &&
            item.amount > 0 &&
            ["income", "expense"].includes(item.type) &&
            typeof item.category === "string" &&
            typeof item.date === "string"
        );
    } catch {
        return [];
    }
}

function saveTransactions() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(transactions)
        );
    } catch {
        alert("Unable to save data. Check your browser storage.");
    }
}

// ======================================
// CURRENCY FORMAT
// ======================================

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}

// ======================================
// DATE FORMAT
// ======================================

function formatDate(date) {
    return new Date(date + "T00:00:00").toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function currentMonthTransactions() {
    const now = new Date();

    return transactions.filter(item => {
        const date = new Date(item.date + "T00:00:00");

        return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
        );
    });
}

// ======================================
// DASHBOARD CALCULATIONS
// ======================================

function updateDashboard() {
    const income = transactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const expenses = transactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    const balance = income - expenses;

    elements.balance.textContent = formatCurrency(balance);
    elements.income.textContent = formatCurrency(income);
    elements.expense.textContent = formatCurrency(expenses);

    elements.transactionCount.textContent = transactions.length;
    elements.transactionBadge.textContent =
        `${transactions.length} Records`;

    updateBudget();
    updateChart();
    updateTransactions();
}

// ======================================
// BUDGET MANAGEMENT
// ======================================

function getBudget() {
    const budget = Number(localStorage.getItem(BUDGET_KEY));

    return Number.isFinite(budget) && budget > 0
        ? budget
        : 0;
}

function updateBudget() {
    const budget = getBudget();

    const monthlyExpenses = currentMonthTransactions()
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    elements.monthlyBudget.textContent =
        budget > 0 ? formatCurrency(budget) : "Not set";

    elements.remainingBalance.textContent =
        budget > 0
            ? formatCurrency(budget - monthlyExpenses)
            : "Not set";

    const percentage = budget > 0
        ? (monthlyExpenses / budget) * 100
        : 0;

    elements.budgetProgress.style.width =
        `${Math.min(percentage, 100)}%`;

    elements.budgetText.textContent =
        budget > 0
            ? `${percentage.toFixed(1)}% of monthly budget used`
            : "No budget set";

    elements.budgetProgress.style.background =
        percentage > 100
            ? "#ff6680"
            : "linear-gradient(90deg, #4388ff, #31d69b)";
}

// ======================================
// ADD TRANSACTION
// ======================================

function addTransaction(event) {
    event.preventDefault();

    const description =
        document.getElementById("description").value.trim();

    const amount = Number(
        document.getElementById("amount").value
    );

    const category =
        document.getElementById("category").value;

    const type =
        document.getElementById("type").value;

    const date =
        document.getElementById("date").value;

    if (
        !description ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 1000000000000 ||
        !date ||
        !["income", "expense"].includes(type)
    ) {
        alert("Please enter valid transaction details.");
        return;
    }

    const transaction = {
        id: crypto.randomUUID(),
        description,
        amount,
        category,
        type,
        date
    };

    transactions.push(transaction);

    saveTransactions();
    updateDashboard();

    elements.form.reset();
    setDefaultDate();
    closeModal();
}

// ======================================
// DISPLAY TRANSACTIONS
// ======================================

function updateTransactions() {
    const sorted = [...transactions].sort((a, b) =>
        b.date.localeCompare(a.date) ||
        b.id.localeCompare(a.id)
    );

    if (sorted.length === 0) {
        elements.transactionList.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No transactions yet. Add your first transaction!
                </td>
            </tr>
        `;
        return;
    }

    elements.transactionList.innerHTML = sorted
        .map(item => {
            const typeClass =
                item.type === "income"
                    ? "income-type"
                    : "expense-type";

            const sign =
                item.type === "income" ? "+" : "-";

            const safeDescription =
                escapeHTML(item.description);

            const safeCategory =
                escapeHTML(item.category);

            return `
                <tr>
                    <td><strong>${safeDescription}</strong></td>
                    <td>${safeCategory}</td>
                    <td>${formatDate(item.date)}</td>
                    <td>
                        <span class="${typeClass}">
                            ${item.type}
                        </span>
                    </td>
                    <td>
                        <strong>${sign}${formatCurrency(item.amount)}</strong>
                    </td>
                    <td>
                        <button
                            class="delete-button"
                            data-delete-id="${escapeHTML(item.id)}"
                            aria-label="Delete ${safeDescription}"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        })
        .join("");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// ======================================
// DELETE TRANSACTION
// ======================================

elements.transactionList.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-id]");

    if (!button) return;

    const id = button.dataset.deleteId;

    if (!confirm("Delete this transaction?")) return;

    transactions = transactions.filter(
        item => item.id !== id
    );

    saveTransactions();
    updateDashboard();
});

// ======================================
// EXPENSE CHART
// ======================================

function updateChart() {
    if (typeof Chart === "undefined") return;

    const categoryTotals = {};

    transactions
        .filter(item => item.type === "expense")
        .forEach(item => {
            categoryTotals[item.category] =
                (categoryTotals[item.category] || 0) +
                item.amount;
        });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(elements.chart, {
        type: "doughnut",

        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    "#4388ff",
                    "#31d69b",
                    "#ff6680",
                    "#a78bfa",
                    "#fbbf24",
                    "#22d3ee"
                ],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#aab8d0",
                        padding: 16,
                        usePointStyle: true
                    }
                }
            },

            cutout: "68%"
        }
    });
}

// ======================================
// MODAL
// ======================================

function openModal() {
    elements.modal.classList.add("show");
    document.getElementById("description").focus();
}

function closeModal() {
    elements.modal.classList.remove("show");
}

document.getElementById("openModal")
    .addEventListener("click", openModal);

document.getElementById("closeModal")
    .addEventListener("click", closeModal);

elements.modal.addEventListener("click", event => {
    if (event.target === elements.modal) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        elements.modal.classList.contains("show")
    ) {
        closeModal();
    }
});

// ======================================
// DEFAULT DATE
// ======================================

function setDefaultDate() {
    const today = new Date();
    const localDate = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000
    ).toISOString().split("T")[0];

    document.getElementById("date").value = localDate;
}

// ======================================
// FORM EVENTS
// ======================================

elements.form.addEventListener("submit", addTransaction);

// ======================================
// START APPLICATION
// ======================================

setDefaultDate();
updateDashboard();

console.log("SpendWise is running successfully!");
