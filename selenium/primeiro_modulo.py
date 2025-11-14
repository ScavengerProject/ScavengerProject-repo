from selenium import webdriver # importa o driver pro google, precisa estar aqui pra funcionar!
import time

# Defini o navegador Chrome (é o mais tranquilo para todos)
navegador = webdriver.Chrome()

# Define link do site para iniciar
navegador.get("https://www.google.com")

# Do o tempo para a tela ficar aberta e depois fechar
time.sleep(5)