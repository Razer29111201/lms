fetch("http://localhost:3000/api/classes", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({

        "code": "MATH101",
        "name": "Toán 10A1",
        "teacher": "Nguyễn Văn A",
        "teacher_id": 1,
        "cm": "Lê Thị B",
        "cm_id": 3,
        "start_date": "2024-01-15",
        "week_day": 2,
        "time_slot": "08:00-10:00",
        "color": "blue"


    })
})
    .then(response => response.json())
    .then(data => {
        console.log("Server response:", data);
    })
    .catch(error => {
        console.error("Error:", error);
    });
