import { Button, Input, Spinner, Tabs, useInput, useToasts } from '@geist-ui/core'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  getProviderConfigs,
  getUserConfig,
  ProviderConfigs,
  ProviderType,
  saveProviderConfigs,
  Theme,
} from '../config'
import { detectSystemColorScheme } from '../utils'

interface ConfigProps {
  config: ProviderConfigs
}

interface OpenAIModel {
  id: string
  object: string
  created: number
  owned_by: string
}

interface OpenAIModelList {
  object: string
  data: OpenAIModel[]
}

async function fetchModelsFromAPI(
  apiKey: string,
  apiBaseUrl = 'https://api.openai.com',
): Promise<string[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: OpenAIModelList = await response.json()
    return data.data.map((model) => model.id)
  } catch (error) {
    console.error('Failed to get model list:', error)
    return []
  }
}

// 创建一个自定义的下拉选择组件，包含搜索功能
const ModelSelect: FC<{
  models: string[]
  value: string
  onChange: (value: string | string[]) => void
  placeholder: string
  disabled: boolean
}> = ({ models, value, onChange, placeholder, disabled }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTheme, setCurrentTheme] = useState<Theme>(Theme.Light)

  // 检测当前主题
  useEffect(() => {
    const detectTheme = async () => {
      const userConfig = await getUserConfig()
      let theme = userConfig.theme

      if (theme === Theme.Auto) {
        theme = detectSystemColorScheme()
      }

      setCurrentTheme(theme)
    }

    detectTheme()

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      getUserConfig().then((config) => {
        if (config.theme === Theme.Auto) {
          setCurrentTheme(detectSystemColorScheme())
        }
      })
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // 根据主题设置颜色
  const getThemeColors = () => {
    const isDark = currentTheme === Theme.Dark
    return {
      background: isDark ? '#1a1a1a' : 'white',
      text: isDark ? '#e0e0e0' : 'black',
      border: isDark ? '#333333' : '#eaeaea',
      inputBackground: isDark ? '#2a2a2a' : 'white',
      hoverBackground: isDark ? '#333333' : '#f9f9f9',
      selectedBackground: isDark ? '#3a3a3a' : '#f0f0f0',
      placeholder: isDark ? '#888888' : '#888888',
      shadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
    }
  }

  const colors = getThemeColors()

  // 过滤模型列表
  const filteredModels = models.filter((model) =>
    model.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  // 清除搜索内容
  const clearSearch = () => {
    setSearchTerm('')
  }

  // 处理自定义模型输入变化
  const handleCustomModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomModel(e.target.value)
  }

  // 使用自定义模型
  const applyCustomModel = () => {
    if (customModel.trim()) {
      onChange(customModel.trim())
      setCustomModel('')
      setSearchTerm('')
      setIsOpen(false)
    }
  }

  // 按下回车使用自定义模型
  const handleCustomModelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customModel.trim()) {
      applyCustomModel()
    }
  }

  // 选择模型
  const handleSelect = (value: string) => {
    onChange(value)
    setSearchTerm('')
    setCustomModel('')
    setIsOpen(false)
  }

  // 处理下拉框的显示和隐藏
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        // 当打开下拉框时，聚焦到搜索框
        setTimeout(() => {
          containerRef.current?.querySelector('input')?.focus()
        }, 100)
      }
    }
  }

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div
      className="custom-select-container"
      ref={containerRef}
      style={{ position: 'relative', width: '100%' }}
    >
      <div
        className={`custom-select-header ${disabled ? 'disabled' : ''}`}
        onClick={toggleDropdown}
        style={{
          padding: '5px 12px',
          border: `1px solid ${colors.border}`,
          borderRadius: '6px',
          fontSize: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: disabled
            ? currentTheme === Theme.Dark
              ? '#222222'
              : '#fafafa'
            : colors.background,
          color: colors.text,
        }}
      >
        {value || placeholder}
      </div>

      {isOpen && (
        <div
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            maxHeight: '300px',
            backgroundColor: colors.background,
            borderRadius: '6px',
            fontSize: '12px',
            marginTop: '5px',
            zIndex: 1000,
            boxShadow: colors.shadow,
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${colors.border}`,
          }}
        >
          <div
            className="search-box"
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: colors.background,
              zIndex: 1001,
              padding: '8px 8px 4px 8px',
            }}
          >
            <Input
              scale={2 / 3}
              width="100%"
              placeholder="Search models..."
              value={searchTerm}
              onChange={handleSearchChange}
              clearable
              onClearClick={clearSearch}
              autoFocus
            />
          </div>

          <div
            className="custom-model-box"
            style={{
              position: 'sticky',
              top: '40px',
              backgroundColor: colors.background,
              zIndex: 1001,
              padding: '4px 8px 8px 8px',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Input
                scale={2 / 3}
                width="100%"
                placeholder="Enter custom model..."
                value={customModel}
                onChange={handleCustomModelChange}
                onKeyDown={handleCustomModelKeyDown}
              />
              <Button
                scale={1 / 3}
                auto
                type="success"
                onClick={applyCustomModel}
                disabled={!customModel.trim()}
                style={{ padding: '0 10px', height: '30px', minWidth: 'auto', fontSize: '12px' }}
              >
                use
              </Button>
            </div>
          </div>

          <div
            className="options-container"
            style={{
              overflowY: 'auto',
              maxHeight: '250px',
              backgroundColor: colors.background,
            }}
          >
            {filteredModels.length > 0 ? (
              filteredModels.map((model) => (
                <div
                  key={model}
                  className={`option-item ${value === model ? 'selected' : ''}`}
                  onClick={() => handleSelect(model)}
                  style={{
                    padding: '5px 12px',
                    cursor: 'pointer',
                    backgroundColor: value === model ? colors.selectedBackground : 'transparent',
                    color: colors.text,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.hoverBackground)
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      value === model ? colors.selectedBackground : 'transparent')
                  }
                >
                  {model}
                </div>
              ))
            ) : (
              <div
                className="empty-message"
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: colors.placeholder,
                }}
              >
                {searchTerm ? 'No matching models' : 'No models loaded'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ConfigPanel: FC<ConfigProps> = ({ config }) => {
  const [tab, setTab] = useState<ProviderType>(config.provider)
  const { bindings: apiKeyBindings } = useInput(config.configs[ProviderType.GPT3]?.apiKey ?? '')
  const { bindings: apiBaseUrlBindings } = useInput(
    config.configs[ProviderType.GPT3]?.apiBaseUrl ?? '',
  )
  const [model, setModel] = useState(config.configs[ProviderType.GPT3]?.model ?? '')
  const [models, setModels] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false)
  const { setToast } = useToasts()

  // 如果已有配置的模型，确保它在列表中即使还没有获取新的模型列表
  useEffect(() => {
    if (model && !models.includes(model)) {
      setModels((prev) => [...prev, model])
    }
  }, [model, models])

  // 处理模型选择
  const handleModelSelect = (value: string | string[]) => {
    if (typeof value === 'string') {
      setModel(value)
    }
  }

  const loadModels = useCallback(async () => {
    if (!apiKeyBindings.value) {
      setToast({ text: 'Please enter API Key first', type: 'warning' })
      return
    }

    setIsLoadingModels(true)
    try {
      const modelList = await fetchModelsFromAPI(
        apiKeyBindings.value,
        apiBaseUrlBindings.value || 'https://api.openai.com',
      )

      if (modelList.length === 0) {
        setToast({
          text: 'No models retrieved. Please check if your API Key and API Base URL are correct',
          type: 'warning',
        })
        return
      }

      setModels(modelList)

      // 如果当前选中的模型不在列表中，自动选择第一个
      if (modelList.length > 0 && (!model || !modelList.includes(model))) {
        setModel(modelList[0])
      }

      setToast({ text: `Successfully retrieved ${modelList.length} models`, type: 'success' })
    } catch (error) {
      setToast({
        text: `Failed to get model list: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        type: 'error',
      })
    } finally {
      setIsLoadingModels(false)
    }
  }, [apiKeyBindings.value, apiBaseUrlBindings.value, model, setToast])

  // 注释掉自动获取模型列表的行为，改为只在用户主动点击刷新按钮时才获取模型列表
  // useEffect(() => {
  //   if (apiKeyBindings.value && !models.length) {
  //     loadModels();
  //   }
  // }, [apiKeyBindings.value, loadModels, models.length]);

  const save = useCallback(async () => {
    if (tab === ProviderType.GPT3) {
      if (!apiKeyBindings.value) {
        alert('Please enter your OpenAI API key')
        return
      }
      if (!model) {
        alert('Please select a valid model')
        return
      }
    }
    await saveProviderConfigs(tab, {
      [ProviderType.GPT3]: {
        model,
        apiKey: apiKeyBindings.value,
        apiBaseUrl: apiBaseUrlBindings.value,
      },
    })
    setToast({ text: 'Settings saved', type: 'success' })
  }, [apiKeyBindings.value, apiBaseUrlBindings.value, model, setToast, tab])

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={tab} onChange={(v) => setTab(v as ProviderType)}>
        <Tabs.Item label="ChatGPT webapp" value={ProviderType.ChatGPT}>
          The API that powers ChatGPT webapp, free, but sometimes unstable
        </Tabs.Item>
        <Tabs.Item label="OpenAI API" value={ProviderType.GPT3}>
          <div className="flex flex-col gap-2">
            <span>
              OpenAI official API, more stable,{' '}
              <span className="font-semibold">charge by usage</span>
            </span>
            <div className="flex flex-row gap-2" style={{ width: '100%' }}>
              <Input
                htmlType="password"
                label="API Key"
                scale={2 / 3}
                width="100%"
                {...apiKeyBindings}
              />
            </div>
            <div className="flex flex-row gap-2" style={{ width: '100%' }}>
              <Input
                label="API Base URL (optional)"
                scale={2 / 3}
                width="100%"
                placeholder="https://api.openai.com"
                {...apiBaseUrlBindings}
              />
            </div>
            <div className="flex flex-col gap-2" style={{ width: '100%' }}>
              <div className="flex flex-row items-center gap-2">
                <div style={{ flex: 1 }}>
                  <ModelSelect
                    models={models}
                    value={model}
                    onChange={handleModelSelect}
                    placeholder={isLoadingModels ? 'Loading...' : 'Select model'}
                    disabled={isLoadingModels || models.length === 0}
                  />
                </div>
                <Button
                  scale={0.5}
                  auto
                  type="secondary"
                  onClick={loadModels}
                  loading={isLoadingModels}
                >
                  Refresh Models
                </Button>
              </div>
            </div>
            <span className="italic text-xs">
              You can find or create your API key{' '}
              <a
                href="https://platform.openai.com/account/api-keys"
                target="_blank"
                rel="noreferrer"
              >
                here
              </a>
            </span>
            <span className="italic text-xs">
              If you are using a third-party API service, please fill in the corresponding API Base
              URL
            </span>
          </div>
        </Tabs.Item>
      </Tabs>
      <Button scale={2 / 3} ghost style={{ width: 20 }} type="success" onClick={save}>
        Save
      </Button>
    </div>
  )
}

function ProviderSelect() {
  const query = useSWR('provider-configs', async () => {
    const config = await getProviderConfigs()
    return { config }
  })
  if (query.isLoading) {
    return <Spinner />
  }
  return <ConfigPanel config={query.data!.config} />
}

export default ProviderSelect
