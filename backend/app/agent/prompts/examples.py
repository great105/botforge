# Few-shot examples for tool-calling are embedded in the system prompt.
# This file can be extended with more complex examples for fine-tuning.

EXAMPLE_BARBERSHOP = """
User: "Бот для записи в барбершоп"
Agent actions:
1. add_node(type="start", data={"label": "Старт", "triggers": ["command:/start"]})
2. add_node(type="text", data={"label": "Приветствие", "text": "Добро пожаловать в барбершоп! ✂️"})
3. connect_nodes(source_id="node_1", target_id="node_2")
4. add_node(type="buttons", data={"label": "Меню", "text": "Выберите действие:", "buttons": [{"text": "Записаться", "output_handle": "btn_book"}, {"text": "Услуги", "output_handle": "btn_services"}]})
5. connect_nodes(source_id="node_2", target_id="node_3")
6. add_node(type="input", data={"label": "Имя", "text": "Как вас зовут?", "variable": "name"})
7. connect_nodes(source_id="node_3", target_id="node_4", source_handle="btn_book")
8. add_node(type="input", data={"label": "Телефон", "text": "Ваш номер:", "variable": "phone", "validation": "phone"})
9. connect_nodes(source_id="node_4", target_id="node_5")
10. add_node(type="text", data={"label": "Готово", "text": "{name}, вы записаны! Мы позвоним на {phone}."})
11. connect_nodes(source_id="node_5", target_id="node_6")
12. add_node(type="text", data={"label": "Услуги", "text": "Стрижка — 1500₽\\nБорода — 800₽\\nКомплекс — 2000₽"})
13. connect_nodes(source_id="node_3", target_id="node_7", source_handle="btn_services")
14. auto_layout()
15. validate_schema()
"""
