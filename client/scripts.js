let mainField = document.getElementById(`uploadPart`);
let reviewField = document.getElementById(`reviewPart`);
let table_shown = false;

window.addEventListener(`load`, () => {
    for (let i = 0; i < 3; i++) {
        localStorage.setItem(`fileName${i + 1}`, null);
        if (localStorage.getItem(`fileName${i + 1}`) == `null`) {
        }
    }
    localStorage.setItem(`currentFile`, null);
});


function goToReview() {
    mainField.style.display = `none`;
    reviewField.style.display = `block`;
    for (let i = 0; i < 3; i++) {
        if (localStorage.getItem(`fileName${i + 1}`) == `null`) {
            document.getElementById(`getFile${i + 1}`).style.display = `none`;
        } else {
            document.getElementById(`getFile${i + 1}`).style.display = `block`;
        }
    }
}

function goToUpload() {
    const tableContainer = document.getElementById(`reviewTable`);
    tableContainer.innerHTML = ``;
    mainField.style.display = `block`;
    mainField.style = `display:flex; flex-direction: col; align-items: center`;
    reviewField.style.display = `none`;
    clearReviewFields()
}

function clearReviewFields() {
    const tableContainer = document.getElementById(`reviewTable`);
    const iframeContainer = document.getElementById(`iframe`);
    const textareaContainer = document.getElementById(`review`);
    const selectContainer = document.getElementById(`rating`);
    const infoContainer = document.getElementById(`reviewInfo`);
    tableContainer.innerHTML = ``;
    iframeContainer.src = ``;
    textareaContainer.value = ``;
    infoContainer.innerHTML= ``;
    selectContainer.value = `5`;
    localStorage.setItem(`currentFile`, null);    
    table_shown = false;
}

async function upload_file(input) {
    const formData = new FormData();
    const file = input.files[0];
    formData.append(`file_to_upload`, file);

    const url = `http://localhost:5500/upload_file`;
    
    try {
        const response = await fetch(url, {
            method: `POST`,
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Ошибка загрузки файла: ${response.status}`);
        }

        const parsed = await response.json();
        const textField = document.getElementById(`uploadInfo`);

        if (parsed.success) {
            textField.innerHTML = `Файл успешно загружен`;
        } else {
            textField.innerHTML = `Ошибка загрузки файла: ${parsed.reason}`;
        }

        console.log(`HTTP код:`, response.status);
    } catch (error) {
        console.error(`Произошла ошибка:`, error.message);
    }
}

async function get_file_names() {
    const url = `http://localhost:5500/get_file_names`;

    try {
        const response = await fetch(url, {
            method: `GET`,
        });

        if (!response.ok) {
            throw new Error(`Ошибка при запросе: ${response.status}`);
        }

        const parsed = await response.json();

        for (let i = 0; i < parsed.length; i++) {
            localStorage.setItem(`fileName${i + 1}`, parsed[i]);
        }
        goToReview();

        console.log(`HTTP код:`, response.status);
    } catch (error) {
        console.error(`Произошла ошибка:`, error.message);
    } 
}

async function load_file(fileID) {
    clearReviewFields();

    const url = `http://localhost:5500/load_file?`;

    const file = localStorage.getItem(fileID);

    localStorage.setItem(`currentFile`, file);

    try {
        const response = await fetch(url + new URLSearchParams({
            name: localStorage.getItem(fileID),
        }), {
            method: `GET`,
        });

        if (!response.ok) {
            throw new Error(`Ошибка при запросе: ${response.status}`);
        }

        console.log(`HTTP код:`, response.status);

        const blob = await response.blob();
        const object = new Blob([blob], {type: response.headers.get(`Content-Type`)});
        const fileURL = URL.createObjectURL(object);

        const iframe = document.getElementById(`iframe`);
        iframe.src = fileURL;
    } catch (error) {
        console.error(`Произошла ошибка:`, error.message);
    }
}

async function send_review() {
    if (localStorage.getItem(`currentFile`) != `null`) {
        review = document.getElementById(`review`);
        rating = document.getElementById(`rating`);
    
        const url = `http://localhost:5500/send_review`;
        const fileName = localStorage.getItem(`currentFile`);
        for (let i = 0; i < 3; i++) {
            if (localStorage.getItem(`currentFile`) == localStorage.getItem(`fileName${i + 1}`)) {
                document.getElementById(`getFile${i + 1}`).style.display = `none`;
            }
        }
    
        const formData = new FormData();
        formData.append(`filename`, fileName);
        formData.append(`review`, review.value);
        formData.append(`rating`, rating.value);
    
        clearReviewFields();

        try {
            const response = await fetch(url,  {
                method: `POST`,
                body: formData,
            });
    
            if (!response.ok) {
                throw new Error(`Ошибка при запросе: ${response.error}`);
            } else {
                const textField = document.getElementById(`reviewInfo`);
                textField.innerHTML = `оценка отправлена`;
            }

            console.log(`HTTP код:`, response.status);
        } catch (error) {
            console.error(`Произошла ошибка:`, error.message);
        }
    }
}

async function get_reviews() {
    const url = `http://localhost:5500/get_reviews?`;
    const fileName = localStorage.getItem(`currentFile`);

    try {
        const response = await fetch(url + new URLSearchParams({
            name: fileName,
        }), {
            method: `GET`,
        });

        response.json().then((data) => {
            if (!table_shown && fileName != 'null' && data.ratings[0] !== null && data.ratings[0].length != 0) {
                table_shown = true;

                const tableContainer = document.getElementById(`reviewTable`);
                const table = document.createElement(`table`);
        
                const header = table.insertRow(0);
                const headerRating = header.insertCell(0);
                const headerReview = header.insertCell(1);
                headerRating.innerHTML = `Оценка`;
                headerReview.innerHTML = `Комментарий`;
        
                for (let i = 0; i < data.ratings[0].length; i++) {
                    const row = table.insertRow(i + 1);
                    const rating = row.insertCell(0);
                    const review = row.insertCell(1);
                    rating.innerHTML = data.ratings[0][i];
                    review.innerHTML = data.reviews[0][i];
                }
    
                tableContainer.appendChild(table);
            } else {
                if (fileName != 'null') {
                    const textField = document.getElementById(`reviewInfo`);
                    textField.innerHTML = `оценок нет`;
                }
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка при запросе: ${response.status}`);
        }

        console.log(`HTTP код:`, response.status);
    } catch (error) {
        console.error(`Произошла ошибка:`, error.message);
    }
}