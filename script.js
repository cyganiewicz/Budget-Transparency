document.addEventListener("DOMContentLoaded", function() {
    const budgetDataUrl = "https://raw.githubusercontent.com/cyganiewicz/Budget-Transparency/refs/heads/main/TEST%20FY25%20General%20Fund%20Budget%20Master%20for%20Accounting.csv?token=GHSAT0AAAAAACZHVUVKICL42LXAGALLJCQKZYVKDWA";

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
                const headers = rows.shift();
                console.log("Headers:", headers);
                
                return rows.filter(row => row.length === headers.length).map(row => {
                    const item = headers.reduce((acc, header, index) => {
                        acc[header] = isNaN(row[index]) ? row[index] : parseFloat(row[index].replace(/[$,]/g, '').trim() || 0);
                        return acc;
                    }, {});
                    console.log("Parsed Row:", item);
                    return item;
                });
            })
            .catch(error => console.error("Error fetching CSV:", error));
    }

    function updateSummaryCards(data) {
        const totalBudget = data.reduce((acc, item) => acc + (item["FY25 DEPT REQ."] || 0), 0);
        const ytdSpending = data.reduce((acc, item) => acc + (item["FY23 ACTUALS"] || 0), 0);
        const previousYearBudget = data.reduce((acc, item) => acc + (item["FY24 BUDGET"] || 0), 0);
        const budgetChange = totalBudget - previousYearBudget;

        document.getElementById("total-budget").textContent = `$${totalBudget.toLocaleString()}`;
        document.getElementById("ytd-spending").textContent = `$${ytdSpending.toLocaleString()}`;
        document.getElementById("budget-change").textContent = `$${budgetChange.toLocaleString()}`;
    }

    function calculatePercentageChange(fy24, fy25) {
        if (fy24 === 0) return "N/A";
        return (((fy25 - fy24) / fy24) * 100).toFixed(2) + "%";
    }

    function populateTable(data) {
        const tbody = document.getElementById("budget-table-body");
        tbody.innerHTML = "";
        data.forEach(item => {
            const fy23Actuals = item["FY23 ACTUALS"] || 0;
            const fy24Budget = item["FY24 BUDGET"] || 0;
            const fy25DeptReq = item["FY25 DEPT REQ."] || 0;
            const percentageChange = calculatePercentageChange(fy24Budget, fy25DeptReq);

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item["Description"] || "N/A"}</td>
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
