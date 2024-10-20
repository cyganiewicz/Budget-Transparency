document.addEventListener("DOMContentLoaded", function () {
    // URLs for the CSV data
    const budgetDataUrl = "https://raw.githubusercontent.com/cyganiewicz/Budget-Transparency/refs/heads/main/TEST%20FY25%20General%20Fund%20Budget%20Master%20for%20Accounting.csv";
    const chartOfAccountsUrl = "https://raw.githubusercontent.com/cyganiewicz/Budget-Transparency/refs/heads/main/Chart%20of%20Accounts%20Organization.csv";

    // Function to fetch and parse CSV data
    function fetchCSV(url) {
        return fetch(url)
            .then(response => response.text())
            .then(data => Papa.parse(data, { header: true }).data);
    }

    // Initialize the portal with dynamic data
    Promise.all([fetchCSV(budgetDataUrl), fetchCSV(chartOfAccountsUrl)]).then(([budgetData, chartOfAccounts]) => {
        console.log("Budget Data Loaded:", budgetData);
        console.log("Chart of Accounts Data Loaded:", chartOfAccounts);
        
        // Process the data into a structured format
        const structuredData = processData(budgetData, chartOfAccounts);
        console.log("Structured Data:", structuredData);
        
        initializeChartsAndTable(structuredData);
    }).catch(error => {
        console.error("Error loading CSV data:", error);
    });

    // Process the data into a structured format suitable for charts and tables
    function processData(budgetData, chartOfAccounts) {
        const structuredData = [];
        const accountsMap = {};

        // Create a mapping of account numbers to department and category info
        chartOfAccounts.forEach(account => {
            accountsMap[account["Account Number"]] = {
                department: account.Department,
                category: account.Category,
            };
        });

        // Group data by category and department
        budgetData.forEach(item => {
            const accountInfo = accountsMap[item["Account Number"]];
            if (!accountInfo) return; // Skip if no account info is found

            const { department, category } = accountInfo;

            // Find or create the category entry
            let categoryEntry = structuredData.find(c => c.category === category);
            if (!categoryEntry) {
                categoryEntry = { category, total: 0, departments: [] };
                structuredData.push(categoryEntry);
            }

            // Find or create the department entry
            let departmentEntry = categoryEntry.departments.find(d => d.name === department);
            if (!departmentEntry) {
                departmentEntry = { name: department, total: 0, lineItems: [] };
                categoryEntry.departments.push(departmentEntry);
            }

            // Add the line item
            const lineItem = {
                description: item.Description,
                fy21: parseFloat(item["FY21 ACTUALS"]) || 0,
                fy22: parseFloat(item["FY22 ACTUALS"]) || 0,
                fy23: parseFloat(item["FY23 ACTUALS"]) || 0,
                fy24: parseFloat(item["FY24 BUDGET"]) || 0,
                fy25: parseFloat(item["FY25 DEPT REQ."]) || 0,
            };

            departmentEntry.lineItems.push(lineItem);
            departmentEntry.total += lineItem.fy25;
            categoryEntry.total += lineItem.fy25;
        });

        return structuredData;
    }

    // Initialize the charts and table with the processed data
    function initializeChartsAndTable(budgetData) {
        let currentCategory = null;

        // Function to update the category pie chart
        function updateCategoryPieChart() {
            const ctx = document.getElementById('categoryChart').getContext('2d');
            const categoryLabels = budgetData.map(item => item.category);
            const categoryData = budgetData.map(item => item.total);

            // Create the category pie chart
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: categoryLabels,
                    datasets: [{
                        label: 'Total Spending by Category',
                        data: categoryData,
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                        ]
                    }]
                },
                options: {
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            currentCategory = budgetData[index];
                            console.log("Selected Category:", currentCategory);
                            updateDetailedTable();
                        }
                    },
                    responsive: true,
                    plugins: {
                        legend: { display: true }
                    }
                }
            });
        }

        // Function to update the detailed table based on the selected category
        function updateDetailedTable() {
            const tableBody = document.getElementById('budgetTable').querySelector('tbody');
            tableBody.innerHTML = '';

            if (!currentCategory) {
                return;
            }

            currentCategory.departments.forEach(department => {
                const deptRow = document.createElement('tr');
                deptRow.innerHTML = `
                    <td colspan="8"><strong>${department.name}</strong></td>
                `;
                tableBody.appendChild(deptRow);

                department.lineItems.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${department.name}</td>
                        <td>${currentCategory.category}</td>
                        <td>${item.description}</td>
                        <td>${item.fy21.toFixed(2)}</td>
                        <td>${item.fy22.toFixed(2)}</td>
                        <td>${item.fy23.toFixed(2)}</td>
                        <td>${item.fy24.toFixed(2)}</td>
                        <td>${item.fy25.toFixed(2)}</td>
                    `;
                    tableBody.appendChild(row);
                });
            });

            document.getElementById('data-table').scrollIntoView({ behavior: 'smooth' });
        }

        // Initialize the category pie chart and the detailed table with the first category selected
        updateCategoryPieChart();
        currentCategory = budgetData[0];
        updateDetailedTable();
    }
});
