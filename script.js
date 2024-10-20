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
        
        initializeSummary(structuredData);
        initializeCharts(structuredData);
        initializeTable(structuredData);
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

        // Group data by category and department, and calculate totals for FY24 and FY25
        let totalFY24 = 0;
        let totalFY25 = 0;

        budgetData.forEach(item => {
            const accountInfo = accountsMap[item["Account Number"]];
            if (!accountInfo) return;

            const { department, category } = accountInfo;

            let categoryEntry = structuredData.find(c => c.category === category);
            if (!categoryEntry) {
                categoryEntry = { category, totalFY24: 0, totalFY25: 0, departments: [] };
                structuredData.push(categoryEntry);
            }

            let departmentEntry = categoryEntry.departments.find(d => d.name === department);
            if (!departmentEntry) {
                departmentEntry = { name: department, totalFY24: 0, totalFY25: 0, lineItems: [] };
                categoryEntry.departments.push(departmentEntry);
            }

            const fy24 = parseFloat(item["FY24 BUDGET"]) || 0;
            const fy25 = parseFloat(item["FY25 DEPT REQ."]) || 0;

            // Update totals
            totalFY24 += fy24;
            totalFY25 += fy25;
            categoryEntry.totalFY24 += fy24;
            categoryEntry.totalFY25 += fy25;
            departmentEntry.totalFY24 += fy24;
            departmentEntry.totalFY25 += fy25;

            const lineItem = {
                description: item.Description,
                fy21: parseFloat(item["FY21 ACTUALS"]) || 0,
                fy22: parseFloat(item["FY22 ACTUALS"]) || 0,
                fy23: parseFloat(item["FY23 ACTUALS"]) || 0,
                fy24,
                fy25
            };

            departmentEntry.lineItems.push(lineItem);
        });

        return { structuredData, totalFY24, totalFY25 };
    }

    // Initialize the summary section
    function initializeSummary({ totalFY24, totalFY25 }) {
        const percentChange = ((totalFY25 - totalFY24) / totalFY24) * 100;
        document.getElementById('summary').innerHTML = `
            <h2>Summary of Expenses</h2>
            <p>Total FY24 Expenses: $${totalFY24.toFixed(2)}</p>
            <p>Total FY25 Expenses: $${totalFY25.toFixed(2)}</p>
            <p>Percent Change: ${percentChange.toFixed(2)}%</p>
        `;
    }

    // Initialize the charts for category and department spending
    function initializeCharts({ structuredData }) {
        updateCategoryPieChart(structuredData);
        updateDepartmentTreemap(structuredData);
    }

    // Function to update the category pie chart
    function updateCategoryPieChart(structuredData) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        const categoryLabels = structuredData.map(item => item.category);
        const categoryData = structuredData.map(item => item.totalFY25);

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
                responsive: true,
                plugins: {
                    legend: { display: true }
                }
            }
        });
    }

    // Function to update the department treemap chart
    function updateDepartmentTreemap(structuredData) {
        const ctx = document.getElementById('departmentTreemap').getContext('2d');
        const treemapData = structuredData.flatMap(category => 
            category.departments.map(department => ({
                label: `${category.category} - ${department.name}`,
                value: department.totalFY25
            }))
        );

        // Use a library like D3 or Chart.js treemap if supported (Chart.js may require a plugin)
        // Example: Chart.js Treemap or similar rendering logic goes here
        console.log("Treemap Data:", treemapData);
        // For now, console log for placeholder of the treemap logic.
    }

    // Initialize the detailed table with expandable rows for categories and departments
    function initializeTable({ structuredData }) {
        const tableBody = document.getElementById('budgetTable').querySelector('tbody');
        tableBody.innerHTML = '';

        structuredData.forEach(category => {
            // Create a row for the category with a total
            const categoryRow = document.createElement('tr');
            categoryRow.innerHTML = `
                <td colspan="8" class="category-row"><strong>${category.category} - Total: $${category.totalFY25.toFixed(2)}</strong></td>
            `;
            tableBody.appendChild(categoryRow);

            // Add event listener for expanding/collapsing category rows
            categoryRow.addEventListener('click', () => {
                category.departments.forEach(department => {
                    const deptRow = document.createElement('tr');
                    deptRow.classList.add('department-row');
                    deptRow.innerHTML = `
                        <td colspan="8" class="department-row"><strong>${department.name} - Total: $${department.totalFY25.toFixed(2)}</strong></td>
                    `;
                    tableBody.appendChild(deptRow);

                    // Add line items under each department
                    department.lineItems.forEach(item => {
                        const lineItemRow = document.createElement('tr');
                        lineItemRow.innerHTML = `
                            <td>${department.name}</td>
                            <td>${category.category}</td>
                            <td>${item.description}</td>
                            <td>${item.fy21.toFixed(2)}</td>
                            <td>${item.fy22.toFixed(2)}</td>
                            <td>${item.fy23.toFixed(2)}</td>
                            <td>${item.fy24.toFixed(2)}</td>
                            <td>${item.fy25.toFixed(2)}</td>
                        `;
                        tableBody.appendChild(lineItemRow);
                    });
                });
            });
        });
    }
});
