import time
from collections import defaultdict

class SPADE:
    def __init__(self, min_support):
        self.min_support = min_support
        self.id_lists = defaultdict(list)  # Lưu danh sách (SID, EID) cho mỗi item và itemset
        self.frequent_patterns = []  # Lưu các mẫu phổ biến
        self.execution_stats = {
            'total_sequences': 0,
            'total_items': 0,
            'frequent_items': 0,
            'item_time': 0.0,
            'seq2_time': 0.0,
            'extend_time': 0.0,
            'total_time': 0.0
        }

    def load_from_file(self, file_path):
        """Đọc dữ liệu từ file và xây dựng danh sách ID (định dạng dọc)"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                for sid, line in enumerate(file):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        # Bỏ dấu {} ở đầu và cuối dòng nếu có
                        content = line.strip('{}')
                        # Tách các itemset bằng '},{'
                        itemsets = content.split('},{')
                        
                        sequence = []
                        for eid, itemset in enumerate(itemsets):
                            # Tách các item bằng khoảng trắng
                            items = [item.strip() for item in itemset.split() if item.strip()]
                            if items:
                                sequence.append(items)
                                # Thêm vào id_lists cho mỗi item
                                for item in items:
                                    self.id_lists[item].append((sid, eid))
                                    self.execution_stats['total_items'] += 1
                                # Thêm vào id_lists cho itemset (nếu có nhiều hơn 1 item)
                                if len(items) > 1:
                                    itemset_key = '{' + ' '.join(sorted(items)) + '}'
                                    self.id_lists[itemset_key].append((sid, eid))
                        if sequence:
                            self.execution_stats['total_sequences'] += 1
                    except Exception as e:
                        raise ValueError(f"Lỗi ở dòng {sid + 1}: {str(e)}")
        except FileNotFoundError:
            raise ValueError(f"Không tìm thấy file: {file_path}")
        except UnicodeDecodeError:
            raise ValueError("File không đúng định dạng UTF-8")

    def _get_frequent_items(self):
        """Lấy các item và itemset phổ biến đạt ngưỡng hỗ trợ tối thiểu"""
        frequent_items = []
        for key, id_list in self.id_lists.items():
            # Đếm số SID duy nhất
            support = len(set(sid for sid, _ in id_list))
            if support >= self.min_support:
                frequent_items.append((key, support, key))
                self.frequent_patterns.append(([key], support))
        self.execution_stats['frequent_items'] = len(frequent_items)
        return sorted(frequent_items, key=lambda x: x[0])  # Sắp xếp theo key

    def _temporal_join(self, id_list1, id_list2, is_sequence_extension, key1, key2):
        """Thực hiện temporal join giữa hai danh sách ID"""
        result = []
        ptr1 = ptr2 = 0
        while ptr1 < len(id_list1) and ptr2 < len(id_list2):
            sid1, eid1 = id_list1[ptr1]
            sid2, eid2 = id_list2[ptr2]
            
            if sid1 < sid2:
                ptr1 += 1
            elif sid1 > sid2:
                ptr2 += 1
            else:  # same sequence
                if is_sequence_extension:
                    # Sequence extension: item2 phải xuất hiện sau item1
                    if eid1 < eid2:
                        result.append((sid1, eid2))
                        ptr1 += 1
                        ptr2 += 1
                    elif eid1 >= eid2:
                        ptr2 += 1
                    else:
                        ptr1 += 1
                else:
                    # Itemset extension: item2 trong cùng itemset với item1
                    if eid1 == eid2:
                        # Kiểm tra thứ tự từ vựng để tránh trùng lặp
                        if key1 < key2:
                            result.append((sid1, eid1))
                        ptr1 += 1
                        ptr2 += 1
                    elif eid1 < eid2:
                        ptr1 += 1
                    else:
                        ptr2 += 1
        return result

    def _get_frequent_2_sequences(self, frequent_items):
        """Tìm các chuỗi 2-phổ biến bằng temporal join"""
        frequent_2_sequences = []
        
        for i, (item1, support1, key1) in enumerate(frequent_items):
            id_list1 = self.id_lists[key1]
            
            for j, (item2, support2, key2) in enumerate(frequent_items[i:], start=i):
                id_list2 = self.id_lists[key2]
                
                # Sequence extension: item1 -> item2
                joined_list = self._temporal_join(id_list1, id_list2, is_sequence_extension=True, key1=key1, key2=key2)
                support = len(set(sid for sid, _ in joined_list))
                if support >= self.min_support:
                    pattern = [key1, key2]
                    frequent_2_sequences.append((pattern, support))
                
                # Itemset extension: {item1, item2} (chỉ khi item1 và item2 là item đơn và key1 < key2)
                if i != j and not key1.startswith('{') and not key2.startswith('{') and key1 < key2:
                    joined_list = self._temporal_join(id_list1, id_list2, is_sequence_extension=False, key1=key1, key2=key2)
                    support = len(set(sid for sid, _ in joined_list))
                    if support >= self.min_support:
                        new_itemset = '{' + ' '.join(sorted([key1, key2])) + '}'
                        pattern = [new_itemset]
                        frequent_2_sequences.append((pattern, support))
        
        return frequent_2_sequences

    def _extend_sequences(self, prefix, id_list, frequent_items):
        """Mở rộng các chuỗi từ một prefix"""
        last_element = prefix[-1]
        
        candidates = defaultdict(list)
        for sid, eid in id_list:
            for item, _, key in frequent_items:
                for item_sid, item_eid in self.id_lists[key]:
                    if item_sid == sid:
                        if item_eid > eid:  # Sequence extension
                            candidates[key].append((sid, item_eid))
        
        for key in sorted(candidates.keys()):
            new_support = len(set(sid for sid, _ in candidates[key]))
            
            if new_support >= self.min_support:
                # Sequence extension
                new_prefix_seq = prefix + [key]
                self.frequent_patterns.append((new_prefix_seq, new_support))
                self._extend_sequences(new_prefix_seq, candidates[key], frequent_items)

    def find_frequent_sequences(self):
        """Tìm tất cả các chuỗi phổ biến theo lý thuyết SPADE"""
        start_time = time.perf_counter()
        self.frequent_patterns = []

        # Bước 1: Tìm item và itemset phổ biến
        item_start = time.perf_counter()
        frequent_items = self._get_frequent_items()
        self.execution_stats['item_time'] = time.perf_counter() - item_start

        # Bước 2: Tìm chuỗi 2-phổ biến
        seq2_start = time.perf_counter()
        frequent_2_sequences = self._get_frequent_2_sequences(frequent_items)
        self.frequent_patterns.extend(frequent_2_sequences)
        self.execution_stats['seq2_time'] = time.perf_counter() - seq2_start

        # Bước 3: Mở rộng các chuỗi
        extend_start = time.perf_counter()
        for item, support, key in frequent_items:
            id_list = self.id_lists[key]
            self._extend_sequences([key], id_list, frequent_items)
        
        for pattern, support in frequent_2_sequences:
            if len(pattern) == 2:  # Sequence extension
                id_list = self._temporal_join(self.id_lists[pattern[0]], self.id_lists[pattern[1]], True, pattern[0], pattern[1])
                self._extend_sequences(pattern, id_list, frequent_items)
            elif len(pattern) == 1 and pattern[0].startswith('{'):  # Itemset extension
                items = sorted(pattern[0].strip('{}').split())
                id_list = self._temporal_join(self.id_lists[items[0]], self.id_lists[items[1]], False, items[0], items[1])
                self._extend_sequences(pattern, id_list, frequent_items)
        
        self.execution_stats['extend_time'] = time.perf_counter() - extend_start
        self.execution_stats['total_time'] = time.perf_counter() - start_time

        # Loại bỏ trùng lặp (nếu có)
        unique_patterns = []
        seen = set()
        for pattern, support in self.frequent_patterns:
            pattern_tuple = tuple(pattern)  # Chuyển list thành tuple để hash
            if pattern_tuple not in seen:
                seen.add(pattern_tuple)
                unique_patterns.append((pattern, support))

        # Format patterns for display
        formatted_patterns = []
        for pattern, support in unique_patterns:
            formatted_pattern = [item for item in pattern]
            formatted_patterns.append((formatted_pattern, support))
        
        # Sắp xếp kết quả theo độ dài giảm dần, rồi theo support giảm dần
        formatted_patterns.sort(key=lambda x: (-len(x[0]), -x[1]))
        return formatted_patterns

def spade(filepath, min_support):
    """
    Hàm giao tiếp giữa app.py và class SPADE.
    Args:
        filepath (str): Đường dẫn đến file dữ liệu.
        min_support (int): Ngưỡng hỗ trợ tối thiểu.
    Returns:
        List of (pattern, support): Danh sách các chuỗi phổ biến và số lần xuất hiện.
    """
    spade_obj = SPADE(min_support)
    spade_obj.load_from_file(filepath)
    return spade_obj.find_frequent_sequences()