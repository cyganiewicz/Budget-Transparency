document.addEventListener("DOMContentLoaded", function() {
    const budgetDataUrl = "https://raw.githubusercontent.com/cyganiewicz/Budget-Transparency/refs/heads/main/TEST%20FY25%20General%20Fund%20Budget%20Master%20for%20Accounting.csv";
    const chartOfAccountsUrl = "https://raw.githubusercontent.com/cyganiewicz/Budget-Transparency/refs/heads/main/Chart%20of%20Accounts";

    let chartOfAccounts = {};

    function fetchCSV(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                return response.text();
            })
            .then(text => {
                const rows = text.trim().split("\n").map(row => row.split(",").map(cell => cell.trim()));
                const headers = rows.shift().map(header => header.trim());
                return rows.map(row => {
                    return headers.reduce((acc, header, index) => {
                        const value = row[index]?.replace(/[$,]/g, '').trim();
                        acc[header] = isNaN(value) ? value : parseFloat(value);
                        return acc;
                    }, {});
                });
            })
            .catch(error => console.error("Error fetching CSV:", error));
    }

    function loadChartOfAccounts() {
        return fetchCSV(chartOfAccountsUrl).then(data => {
            chartOfAccounts = data.reduce((acc, item) => {
                const accountNumber = item["Account Number"];
                if (accountNumber && item["Category"] && item["Department"]) {
                    acc[accountNumber] = {
                        category: item["Category"],
                        department: item["Department"]
                    };
                } else {
                    console.warn("Invalid entry in Chart of Accounts:", item);
                }
                return acc;
            }, {});
            console.log("Chart of Accounts:", chartOfAccounts);
        });
    }

    function updateSummaryCards(data) {
        const totalFY25 = data.reduce((acc, item) => acc + (item["FY25 DEPT REQ."] || 0), 0);
        const totalFY24 = data.reduce((acc, item) => acc + (item["FY24 BUDGET"] || 0), 0);
        const percentageChange = calculatePercentageChange(totalFY24, totalFY25);

        document.getElementById("total-budget").textContent = `$${totalFY25.toLocaleString()}`;
        document.getElementById("ytd-spending").textContent = `$${totalFY24.toLocaleString()}`;
        document.getElementById("budget-change").textContent = percentageChange;
    }

    function calculatePercentageChange(fy24, fy25) {
        if (fy24 === 0) return "N/A";
        return (((fy25 - fy24) / fy24) * 100).toFixed(2) + "%";
    }

    function groupDataByCategoryAndDepartment(data) {
        const grouped = data.reduce((acc, item) => {
            const accountNumber = item["Account Number"];
            const chartEntry = chartOfAccounts[accountNumber] || {};
            const category = chartEntry.category || "Uncategorized";
            const department = chartEntry.department || "Unknown Department";

            if (!acc[category]) {
                acc[category] = {};
            }
            if (!acc[category][department]) {
                acc[category][department] = [];
            }

            acc[category][department].push(item);
            return acc;
        }, {});

        return grouped;
    }

    function populateTable(data) {
        const tbody = document.getElementById("budget-table-body");
        tbody.innerHTML = "";

        const groupedData = groupDataByCategoryAndDepartment(data);
        Object.keys(groupedData).forEach(category => {
            const categoryRow = document.createElement("tr");
            categoryRow.innerHTML = `
                <td colspan="5" class="category-row" style="background-color: #007BFF; color: white; cursor: pointer;">
                    ${category} (Click to Expand)
                </td>
            `;
            categoryRow.addEventListener("click", () => {
                const detailsRows = tbody.querySelectorAll(`.details-${category}`);
                detailsRows.forEach(row => row.classList.toggle("hidden"));
            });
            tbody.appendChild(categoryRow);

            Object.keys(groupedData[category]).forEach(department => {
                const departmentRow = document.createElement("tr");
                departmentRow.classList.add(`details-${category}`);
                departmentRow.classList.add("hidden");
                departmentRow.innerHTML = `
                    <td colspan="5" class="department-row" style="background-color: #17a2b8; color: white; cursor: pointer;">
                        ${department} (Click to Expand)
                    </td>
                `;
                departmentRow.addEventListener("click", () => {
                    const lineItemRows = tbody.querySelectorAll(`.line-item-${category}-${department}`);
                    lineItemRows.forEach(row => row.classList.toggle("hidden"));
                });
                tbody.appendChild(departmentRow);

                groupedData[category][department].forEach(item => {
                    const description = item["Description"] || "N/A";
                    const fy23Actuals = item["FY23 ACTUALS"] || 0;
                    const fy24Budget = item["FY24 BUDGET"] || 0;
                    const fy25DeptReq = item["FY25 DEPT REQ."] || 0;
                    const percentageChange = calculatePercentageChange(fy24Budget, fy25DeptReq);

                    const row = document.createElement("tr");
                    row.classList.add(`line-item-${category}-${department}`);
                    row.classList.add("hidden");
                    row.innerHTML = `
                        <td>${description} (${item["Account Number"]})</td>
                        <td>$${fy23Actuals.toLocaleString()}</td>
                        <td>$${fy24Budget.toLocaleString()}</td>
                        <td>$${fy25DeptReq.toLocaleString()}</td>
                        <td>${percentageChange}</td>
                    `;
                    tbody.appendChild(row);
                });
            });
        });
    }

    function createChart(data) {
        const labels = data.map(item => item["Description"] || "N/A");
        const fy24Budget = data.map(item => item["FY24 BUDGET"] || 0);
        const fy25DeptReq = data.map(item => item["FY25 DEPT REQ."] || 0);

        const ctx = document.getElementById("expenditure-chart").getContext("2d");
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "FY24 Budget",
                        backgroundColor: "rgba(0, 123, 255, 0.5)",
                        data: fy24Budget
                    },
                    {
                        label: "FY25 Dept Request",
                        backgroundColor: "rgba(220, 53, 69, 0.5)",
                        data: fy25DeptReq
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Load Chart of Accounts, then load budget data
    loadChartOfAccounts()
        .then(() => fetchCSV(budgetDataUrl))
        .then(data => {
            updateSummaryCards(data);
            populateTable(data);
            createChart(data);
        })
        .catch(error => console.error("Error loading data:", error));
});
