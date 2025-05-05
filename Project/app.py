from flask import Flask, render_template, request, flash, send_file
import os
from spade_algorithm import spade
import time
import csv
import json
import io

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        file = request.files['file']
        min_support = request.form.get('min_support')

        if not file or not min_support:
            flash('Vui lòng cung cấp file và ngưỡng hỗ trợ.', 'error')
            return render_template('index.html')

        try:
            min_support = int(min_support)
            if min_support < 1:
                raise ValueError("Ngưỡng hỗ trợ phải lớn hơn 0.")
            filepath = os.path.join('uploads', file.filename)
            file.save(filepath)

            with open(filepath, 'r', encoding='utf-8') as f:
                file_content = f.read()

            start_time = time.perf_counter()
            patterns = spade(filepath, min_support)
            exec_time_seconds = time.perf_counter() - start_time

            exec_time_ms = exec_time_seconds * 1000
            if exec_time_ms < 1000:
                exec_time = round(exec_time_ms, 2)
                time_unit = 'ms'
            else:
                exec_time = round(exec_time_seconds, 2)
                time_unit = 'giây'

            if not patterns:
                flash(f'Không tìm thấy dãy phổ biến nào với ngưỡng hỗ trợ tối thiểu là {min_support}. Vui lòng thử với giá trị nhỏ hơn.', 'error')
                return render_template('index.html')

            return render_template('index.html', patterns=patterns, filename=file.filename,
                                 min_support=min_support, exec_time=exec_time, time_unit=time_unit, file_content=file_content)

        except ValueError as e:
            flash(str(e), 'error')
            return render_template('index.html')
        except Exception as e:
            flash(f'Đã xảy ra lỗi: {str(e)}', 'error')
            return render_template('index.html')

    return render_template('index.html')

@app.route('/export/csv', methods=['POST'])
def export_csv():
    data = request.get_json()
    patterns = data['patterns']
    supports = data['supports']
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Pattern', 'Support'])
    for pattern, support in zip(patterns, supports):
        writer.writerow([pattern, support])
    
    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode('utf-8')),
                     mimetype='text/csv',
                     as_attachment=True,
                     download_name='patterns.csv')

@app.route('/export/json', methods=['POST'])
def export_json():
    data = request.get_json()
    patterns = data['patterns']
    supports = data['supports']
    
    output = {'patterns': patterns, 'supports': supports}
    return send_file(io.BytesIO(json.dumps(output, ensure_ascii=False).encode('utf-8')),
                     mimetype='application/json',
                     as_attachment=True,
                     download_name='patterns.json')

if __name__ == '__main__':
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    app.run(debug=True)