document.addEventListener("DOMContentLoaded", function() {
    const budgetDataUrl = "https://raw.githubusercontent.com/cyganiewicz/Budget-Transparency/refs/heads/main/TEST%20FY25%20General%20Fund%20Budget%20Master%20for%20Accounting.csv";

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
                console.log("Raw CSV Rows:", rows);

                const headers = rows.shift().map(header => header.trim());
                console.log("Headers:", headers);

                // Parse the rows into a structured format
                return rows.map(row => {
                    const item = headers.reduce((acc, header, index) => {
                        const value = row[index]?.replace(/[$,]/g, '').trim();
                        acc[header] = isNaN(value) ? value : parseFloat(value);
                        return acc;
                    }, {});
                    console.log("Parsed Item:", item);  // Log each parsed item for debugging
                    return item;
                });
            })
            .catch(error => console.error("Error fetching CSV:", error));
    }

    function updateSummaryCards(data) {
        const totalFY25 = data.reduce((acc, item) => acc + (item["FY25 DEPT REQ."] || 0), 0);
        const totalFY24 = data.reduce((acc, item) => acc + (item["FY24 BUDGET"] || 0), 0);
        const percentageChange = calculatePercentageChange(totalFY24, totalFY25);

        console.log("Total FY25:", totalFY25);
        console.log("Total FY24:", totalFY24);
        console.log("Percentage Change:", percentageChange);

        document.getElementById("total-budget").textContent = `$${totalFY25.toLocaleString()}`;
        document.getElementById("ytd-spending").textContent = `$${totalFY24.toLocaleString()}`;
        document.getElementById("budget-change").textContent = percentageChange;
    }

    function calculatePercentageChange(fy24, fy25) {
        if (fy24 === 0) return "N/A";
        return (((fy25 - fy24) / fy24) * 100).toFixed(2) + "%";
    }

    function populateTable(data) {
        const tbody = document.getElementById("budget-table-body");
        tbody.innerHTML = "";
        data.forEach(item => {
            const accountNumber = item["Account Number"] || "N/A";
            const description = item["Description"] || "N/A";
            const fy23Actuals = item["FY23 ACTUALS"] || 0;
            const fy24Budget = item["FY24 BUDGET"] || 0;
            const fy25DeptReq = item["FY25 DEPT REQ."] || 0;
            const percentageChange = calculatePercentageChange(fy24Budget, fy25DeptReq);

            console.log(`Row for ${description}: FY23 Actuals: ${fy23Actuals}, FY24 Budget: ${fy24Budget}, FY25 Dept Req: ${fy25DeptReq}`);

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${description} (${accountNumber})</td>
                <td>$${fy23Actuals.toLocaleString()}</td>
                <td>$${fy24Budget.toLocaleString()}</td>
                <td>$${fy25DeptReq.toLocaleString()}</td>
                <td>${percentageChange}</td>
            `;
            tbody.appendChild(row);
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

    // Fetch and process the data
    fetchCSV(budgetDataUrl)
        .then(data => {
            updateSummaryCards(data);
            populateTable(data);
            createChart(data);
        })
        .catch(error => console.error("Error loading data:", error));
});
