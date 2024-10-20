document.addEventListener("DOMContentLoaded", function() {
    const budgetDataUrl = "https://raw.githubusercontent.com/cyganiewicz/Budget-Transparency/refs/heads/main/TEST%20FY25%20General%20Fund%20Budget%20Master%20for%20Accounting.csv";
    const chartOfAccountsUrl = "https://raw.githubusercontent.com/cyganiewicz/Budget-Transparency/refs/heads/main/Chart%20of%20Accounts";

    let chartOfAccounts = {};

    function fetchCSV(url) {
        console.log(`Fetching data from: ${url}`);
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                return response.text();
            })
            .then(text => {
                console.log("CSV data fetched successfully.");
                const rows = text.trim().split("\n").map(row => row.split(",").map(cell => cell.trim()));
                const headers = rows.shift().map(header => header.trim());
                console.log("Parsed headers:", headers);
                const data = rows.map(row => {
                    return headers.reduce((acc, header, index) => {
                        const value = row[index]?.replace(/[$,]/g, '').trim();
                        acc[header] = isNaN(value) ? value : parseFloat(value);
                        return acc;
                    }, {});
                });
                console.log("Parsed data:", data);
                return data;
            })
            .catch(error => {
                console.error("Error fetching CSV:", error);
            });
    }

    function loadChartOfAccounts() {
        return fetchCSV(chartOfAccountsUrl).then(data => {
            if (!data) {
                console.error("No data found for Chart of Accounts.");
                return;
            }
            chartOfAccounts = data.reduce((acc, item) => {
                const accountNumber = item["Account Number"];
                if (accountNumber && item["Category"] && item["Department"]) {
                    acc[accountNumber] = {
                        category: item["Category"],
                        department: item["Department"]
                    };
                } else {
                    console.warn("Missing category or department for account:", accountNumber);
                }
                return acc;
            }, {});
            console.log("Loaded Chart of Accounts:", chartOfAccounts);
        });
    }

    function updateSummaryCards(data) {
        const totalFY25 = data.reduce((acc, item) => acc + (item["FY25 DEPT REQ."] || 0), 0);
        const totalFY24 = data.reduce((acc, item) => acc + (item["FY24 BUDGET"] || 0), 0);
        const percentageChange = calculatePercentageChange(totalFY24, totalFY25);

        document.getElementById("total-budget").textContent = `$${totalFY25.toLocaleString()}`;
        document.getElementById("ytd-spending").textContent = `$${totalFY24.toLocaleString()}`;
        document.getElementById("budget-change").textContent = percentageChange;

        console.log("Updated summary cards:", {
            totalFY25,
            totalFY24,
            percentageChange
        });
    }

    function calculatePercentageChange(fy24, fy25) {
        if (fy24 === 0) return "N/A";
        return (((fy25 - fy24) / fy24) * 100).toFixed(2) + "%";
    }

    function groupDataByCategoryAndDepartment(data) {
        console.log("Grouping data by category and department...");
        return data.reduce((acc, item) => {
            const accountNumber = item["Account Number"];
            const chartEntry = chartOfAccounts[accountNumber] || {
                category: "Other Spending",
                department: "Miscellaneous"
            };
            const category = chartEntry.category;
            const department = chartEntry.department;

            if (!acc[category]) {
                acc[category] = {};
            }
            if (!acc[category][department]) {
                acc[category][department] = [];
            }

            acc[category][department].push(item);
            return acc;
        }, {});
    }

    function populateTable(data) {
        console.log("Populating table with data...");
        const tbody = document.getElementById("budget-table-body");
        tbody.innerHTML = "";

        const groupedData = groupDataByCategoryAndDepartment(data);
        console.log("Grouped data:", groupedData);

        Object.keys(groupedData).forEach(category => {
            const categoryRow = document.createElement("tr");
            categoryRow.classList.add("category-row");
            categoryRow.innerHTML = `
                <td colspan="5">${category} (Click to Expand)</td>
            `;
            categoryRow.addEventListener("click", () => {
                const detailsRows = tbody.querySelectorAll(`.details-${category}`);
                detailsRows.forEach(row => row.classList.toggle("hidden"));
            });
            tbody.appendChild(categoryRow);

            Object.keys(groupedData[category]).forEach(department => {
                const departmentRow = document.createElement("tr");
                departmentRow.classList.add(`details-${category}`, "hidden", "department-row");
                departmentRow.innerHTML = `
                    <td colspan="5">${department} (Click to Expand)</td>
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
                    row.classList.add(`line-item-${category}-${department}`, "hidden", "line-item");
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

        console.log("Chart created with data:", { labels, fy24Budget, fy25DeptReq });
    }

    // Load Chart of Accounts, then load budget data and render the page
    loadChartOfAccounts()
        .then(() => fetchCSV(budgetDataUrl))
        .then(data => {
            if (!data) {
                console.error("No data available from the budget CSV.");
                return;
            }
            updateSummaryCards(data);
            populateTable(data);
            createChart(data);
        })
        .catch(error => console.error("Error loading data:", error));
});
